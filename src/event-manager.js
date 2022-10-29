import { Abort } from './utils.js';

export class EventManager {
  constructor(options) {
    const {
      warning = false,
      signal,
    } = options;
    // whether to output a warning when no promises are fulfilled
    this.warning = warning;
    // event handlers
    this.handlers = {};
    // promises that get triggered by handlers
    this.promises = {};
    // resolve functions of promises
    this.resolves = {};
    // reject functions of promises
    this.rejects = {};
    // controls handling of certain promises
    this.types = {};
    // promise that external promises will race against
    this.abortPromise = null;
    // rejection function of promise above
    this.abortReject = null;
    // proxy yielding handler-creating functions
    this.on = new Proxy({}, { get: (_, name) => this.getHandler(name), set: throwError });
    // proxy yielding promises, which is callable itself
    const fn = (promise) => this.wrapExternalPromise(promise);
    this.eventual = new Proxy(fn, { get: (_, name) => this.getPromise(name), set: throwError });
    if (signal) {
      signal.addEventListener('abort', () => this.abortAll(), { once: true });
    }
  }

  getHandler(name) {
    const { handlers } = this;
    let handler = handlers[name];
    if (!handler) {
      const fn = (value) => this.triggerFulfillment(name, value);
      const valueHandlers = { hash: null, map: null };
      handlers[name] = handler = new Proxy(fn, {
        get: (fn, key) => this.getHandlerProp(fn, name, valueHandlers, key),
        set: throwError,
      });
      fn.bind = (...args) => {
        const value = (args.length < 2) ? args[0] : args[1];
        return this.getValueHandler(name, valueHandlers, value);
      };
      const applyFn = fn.apply;
      const filterHandlers = { map: null };
      fn.apply = (...args) => {
        if (args.length !== 1 || typeof(args[0]) !== 'function') {
          return applyFn.call(fn, ...args);
        } else {
          return this.getApplyHandler(name, filterHandlers, args[0]);
        }
      };
    }
    return handler;
  }

  getPromise(name) {
    const { promises, resolves, rejects, types } = this;
    let promise = promises[name];
    if (!promise) {
      promises[name] = promise = new Promise((resolve, reject) => {
        resolves[name] = resolve;
        rejects[name] = reject;
      });
      // allow multiple promises to be chained together
      // promise from an 'or' chain fulfills when the quickest one fulfills
      // promise from an 'add' chain fulfills when all promises do
      this.enablePromiseMerge(promise);
      // allow attachment of a timer using the syntax
      // await eventual.click.for(4).seconds
      this.enableTimeout(promise);
      if (this.warning && process.env.NODE_ENV === 'development') {
        promise.then = (thenFn, catchFn) => {
          if (!(name in this.handlers)) {
            console.warn(`Awaiting eventual.${name} without prior use of on.${name}`);
          }
          delete promise.then;
          promise.then(thenFn, catchFn);
        };
      }
    } else {
      // an important value has just been picked up
      if (types[name] === 'important') {
        delete promises[name];
        delete types[name];
      }
    }
    return promise;
  }

  wrapExternalPromise(promise) {
    // create promise for aborting external promises
    if (!this.abortPromise) {
      this.abortPromise = new Promise((_, reject) => this.abortReject = reject);
    }
    const wrapped = Promise.race([ promise, this.abortPromise ]);
    this.enablePromiseMerge(wrapped);
    this.enableTimeout(wrapped);
    return wrapped;
  }

  enablePromiseMerge(parent) {
    [ 'or', 'and' ].forEach(op => {
      // the op word itself is callable
      const fn = (promise) => {
        const mergedPromise = mergePromises([ parent, promise ], op);
        this.enablePromiseMerge(mergedPromise);
        this.enableTimeout(mergedPromise);
        return mergedPromise;
      };
      parent[op] = new Proxy(fn, { get: (fn, name) => this.getMergedPromise(parent, name, op), set: throwError });
    });
  }

  getMergedPromise(parent, name, op) {
    const { eventual } = this;
    // obtain the last promise in the chain
    const promise = eventual[name];
    // merge it with the ones earlier in the chain
    const mergedPromise = mergePromises([ parent, promise ], op);
    // allow further chaining
    this.enablePromiseMerge(mergedPromise);
    this.enableTimeout(mergedPromise);
    return mergedPromise;
  }

  enableTimeout(parent) {
    const multipliers = {
      milliseconds: 1,
      seconds: 1000,
      minutes: 1000 * 60,
      hours: 1000 * 60 * 60
    };
    parent.for = (number) => {
      if (!(number >= 0)) {
        throw new TypeError(`Invalid duration: ${number}`);
      }
      const proxy = new Proxy({}, {
        get: (_, name) => {
          const multipler = multipliers[name] || multipliers[name + 's'];
          if (multipler === undefined) {
            const msg = (name === 'then') ? 'No time unit selected' : `Invalid time unit: ${name}`;
            throw new Error(msg);
          }
          const delay = number * multipler;
          if (delay === Infinity) {
            return parent;
          }
          let resolve;
          const promise = new Promise(r => resolve = r);
          const timeout = setTimeout(() => resolve('timeout'), delay);
          // kill the timer when promise resolves();
          const stop = () => clearTimeout(timeout);
          parent.then(stop, stop);
          return Promise.race([ parent, promise ]);
        },
        set: throwError,
      });
      return proxy;
    };
  }

  getHandlerProp(fn, name, handlers, key) {
    let value = fn[key];
    if (value !== undefined) {
      // return properties of function
      return value;
    } else {
      return this.getValueHandler(name, handlers, key);
    }
  }

  getValueHandler(name, handlers, value) {
    let handler;
    if (value instanceof Object) {
      // using object as key--need to use weak map
      if (!handlers.map) {
        handlers.map = new WeakMap();
      }
      handler = handlers.map.get(value);
      if (!handler) {
        handler = () => this.triggerFulfillment(name, value);
        handlers.map.set(value, handler);
      }
    } else {
      // scalar value as key--use regular object
      if (!handlers.hash) {
        handlers.hash = {};
      }
      const key = JSON.stringify(value);
      handler = handlers.hash[key];
      if (!handler) {
        // keep up to 128 handlers invariant
        const keys = Object.keys(handlers.hash);
        if (keys.length >= 128) {
          for (const key of keys.slice(0, keys.length - 128 + 1)) {
            delete handlers.hash[key];
          }
        }
        handler = () => this.triggerFulfillment(name, value);
        handlers.hash[key] = handler;
      }
    }
    return handler;
  }

  getApplyHandler(name, handlers, fn)  {
    if (!handlers.map) {
      handlers.map = new WeakMap();
    }
    let handler = handlers.map.get(fn);
    if (!handler) {
      handler = (value) => this.triggerFulfillment(name, fn(value));
      handlers.map.set(fn, handler);
    }
    return handler;
  }

  triggerFulfillment(name, value) {
    const { promises, resolves, rejects, types, warning } = this;
    let important = false, persistent = false, rejecting = false;
    for (;;) {
      if (value instanceof ImportantValue) {
        important = true;
        value = value.value;
      } else if (value instanceof PersistentValue) {
        persistent = true;
        value = value.value;
      } else if (value instanceof ThrowableValue) {
        rejecting = true;
        important = true;
        value = value.value;
      } else {
        break;
      }
    }
    const fn = (rejecting) ? rejects[name] : resolves[name];
    if (fn) {
      fn(value);
    }
    let handled = !!fn;
    if (persistent || (important && !handled)) {
      if (!handled) {
        // allow the value to be picked up later
        const promise = (rejecting) ? Promise.reject(value) : Promise.resolve(value);
        this.enablePromiseMerge(promise);
        this.enableTimeout(promise);
        promises[name] = promise;
        handled = true;
      }
      types[name] = (persistent) ? 'persistent' : 'important';
    } else {
      // remove the promise once it is fulfilled or rejected so a new one will be created later
      delete promises[name];
      delete types[name];
    }
    delete resolves[name];
    delete rejects[name];

    if (!handled && warning && process.env.NODE_ENV === 'development') {
      console.warn(`No promise was fulfilled by call to on.${name}()`);
    }
  }

  abortAll() {
    const err = new Abort('Abort');
    for (const reject of Object.values(this.rejects)) {
      reject(err);
    }
    if (this.abortReject) {
      this.abortReject(err);
    }
  }
}

const promiseMergeMethods = { or: 'race', and: 'all' };

function mergePromises(promiseList, op) {
  const method = promiseMergeMethods[op];
  const merge = Promise[method];
  return merge.call(Promise, promiseList);
}

function throwError() {
  throw new Error('Property is read-only');
}

export function important(value) {
  return new ImportantValue(value);
}

export function persistent(value) {
  return new PersistentValue(value);
}

export function throwing(value) {
  return new ThrowableValue(value);
}

class ImportantValue {
  constructor(value) {
    this.value = value;
  }
}

class PersistentValue {
  constructor(value) {
    this.value = value;
  }
}

class ThrowableValue {
  constructor(value) {
    if (value instanceof Object) {
      if (value.type === 'error' && 'error' in value) {
        value = value.error;
      }
      if (value instanceof Error) {
        this.value = value;
      }
    }
    if (!this.error) {
      this.value = new Error(value);
    }
  }
}
