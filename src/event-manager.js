import { Abort } from './iterator.js';

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
    }
    return handler;
  }

  getPromise(name) {
    const { promises, resolves, rejects } = this;
    let promise = promises[name];
    if (!promise) {
      promises[name] = promise = new Promise((resolve, reject) => {
        resolves[name] = resolve;
        rejects[name] = reject;
      });
      // allow multiple promises to be chained together
      // promise from an 'or' chain fulfills when the quickest one fulfills
      promise.or = this.enablePromiseMerge(promise, 'or');
      // promise from an 'add' chain fulfills when all promises do
      promise.and = this.enablePromiseMerge(promise, 'and');
    }
    return promise;
  }

  wrapExternalPromise(promise) {
    // create promise for aborting external promises
    if (!this.abortPromise) {
      this.abortPromise = new Promise((_, reject) => this.abortReject = reject);
    }
    const wrapped = Promise.race([ promise, this.abortPromise ]);
    wrapped.or = this.enablePromiseMerge(wrapped, 'or');
    wrapped.and = this.enablePromiseMerge(wrapped, 'and');
    return wrapped;
  }

  enablePromiseMerge(parent, op) {
    // the op word itself is callable
    const fn = (promise) => {
      const mergedPromise = mergePromises([ parent, promise ], op);
      mergedPromise[op] = this.enablePromiseMerge(mergedPromise, op);
      return mergedPromise;
    };
    return new Proxy(fn, { get: (fn, name) => this.getMergedPromise(parent, name, op), set: throwError });
  }

  getMergedPromise(parent, name, op) {
    const { eventual } = this;
    // obtain the last promise in the chain
    const promise = eventual[name];
    // merge it with the ones earlier in the chain
    const mergedPromise = mergePromises([ parent, promise ], op);
    // allow further chaining (but only of the same operation)
    mergedPromise[op] = this.enablePromiseMerge(mergedPromise, op);
    return mergedPromise;
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

  triggerFulfillment(name, value) {
    const { promises, resolves, rejects, warning } = this;
    const error = getError(value);
    const fn = (error) ? rejects[name] : resolves[name];
    if (fn) {
      fn(value);
      // remove the promise once it is fulfilled or rejected so a new one will be created later
      delete promises[name];
      delete resolves[name];
      delete rejects[name];
    }
    if (!fn && warning) {
      console.warn(`No promise was fulfilled by call to handler created by ${name}()`);
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

function getError(obj) {
  if (obj instanceof Object) {
    if (obj instanceof Error) {
      return obj;
    } else if (obj.type === 'error' && obj.error instanceof Error) {
      return obj.error;
    }
  }
}
