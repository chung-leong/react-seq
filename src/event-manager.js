import { Abort } from './utils.js';

const MERGED  = 0x0001;
const MERGING = 0x0002;
const STALE   = 0x0004;
const DERIVED = 0x0008;

// subclassing Promise means the JS engine can't employ certain optimizations--we're okay with that
class ManagedPromise extends Promise {
  callbacks = null;
  manager = null;
  name = undefined;
  state = 0;
  timeout = -1;

  static create(manager, name, derived = false, source = null) {
    let resolve, reject;
    const promise = new ManagedPromise((r1, r2) => { resolve = r1; reject = r2; });
    promise.callbacks = { resolve, reject };
    ManagedPromise.init(promise, manager, name, derived);
    if (source) {
      source.then(resolve, reject);
    }
    return promise;
  }

  static init(promise, manager, name, derived) {
    promise.manager = manager;
    promise.name = name;
    promise.state = (derived) ? DERIVED : 0;
    promise.proxitize('or');
    promise.proxitize('and');
  }

  resolve(value) {
    this.callbacks.resolve(value);
    this.manager.reportSettlement(this);
  }

  reject(err) {
    this.callbacks.reject(err);
    this.manager.reportSettlement(this);
  }

  then(thenFn, catchFn) {
    // inform manager something is awaiting on this promise
    // unless then() is called by Promise.race() or Promise.all()
    if (this.state & MERGING) {
      this.state = (this.state & ~MERGING) | MERGED;
    } else if (this.name) {
      this.manager.reportAwaitStart(this);
      // report the end of the awaiting when promise settles
      const end = () => { this.manager.reportAwaitEnd(this) };
      super.then(end, end);
    }
    // call parent function, which will yield a new promise
    const promise = super.then(thenFn, catchFn);
    if (promise instanceof ManagedPromise) {
      // properly initialize it with expected info
      ManagedPromise.init(promise, this.manager, `${this.name}.then(...)`, true);
    }
    return promise;
  }

  value() {
    return Promise.resolve(this.then(obj => Object.values(obj)[0]));
  }

  setTimeout(delay) {
    const result = { timeout: delay };
    const timeout = setTimeout(() => this.resolve(result), delay);
    const stop = () => clearTimeout(timeout);
    super.then(stop, stop);
    this.timeout = delay;
  }

  // allow attachment of a timer using the syntax
  // await eventual.click.for(4).seconds
  for(number) {
    const multipliers = {
      milliseconds: 1,
      seconds: 1000,
      minutes: 1000 * 60,
      hours: 1000 * 60 * 60
    };
    if (!(number >= 0)) {
      throw new TypeError(`Invalid duration: ${number}`);
    }
    const proxy = new Proxy({}, {
      get: (_, name) => {
        if (typeof(name) !== 'string') {
          return;
        }
        const multipler = multipliers[name] ?? multipliers[name + 's'];
        if (multipler === undefined) {
          const msg = (name === 'then') ? 'No time unit selected' : `Invalid time unit: ${name}`;
          throw new Error(msg);
        }
        const delay = number * multipler;
        if (delay === Infinity) {
          return this;
        }
        this.state |= MERGING;
        const promise = ManagedPromise.create(this.manager, `${this.name}.for(${number}).${name}`, true, this);
        promise.setTimeout(delay);
        return promise;
      },
      set: throwError,
    });
    return proxy;
  }

  // promise from an 'or' chain fulfills when the quickest one fulfills
  or(name, promise) {
    return this.combineWithExternal('or', name, promise);
  }

  // promise from an 'and' chain fulfills when all promises do
  and(name, promise) {
    return this.combineWithExternal('and', name, promise);
  }

  // allow the syntax
  // await eventual.click.or.keyPress
  proxitize(op) {
    const fn = this[op].bind(this);
    this[op] = new Proxy(fn, { get: (fn, name) => this.combineWithNamed(op, name), set: throwError });
  }

  combineWithNamed(op, name) {
    const promise = this.manager.getPromise(name);
    if (promise) {
      promise.state |= MERGING;
      return this.combineWith(op, promise, name);
    }
  }

  combineWithExternal(op, name, promise) {
    if (typeof(name) !== 'string') {
      throw new TypeError('A name for the promise is expected');
    }
    const namedOutput = promise.then((value) => {
      const obj = {};
      obj[name] = value;
      return obj;
    });
    return this.combineWith(op, namedOutput, name);
  }

  combineWith(op, promise, suffix) {
    this.state |= MERGING;
    let combined;
    if (op === 'or') {
      combined = Promise.race([ this, promise ]);
    } else {
      combined = Promise.all([ this, promise ]).then(arr => arr.flat().reduce((a, i) => Object.assign(a, i), {}));
    }
    const name = (this.name) ? `${this.name}.${op}.${suffix}` : suffix;
    combined = ManagedPromise.create(this.manager, name, true, combined);
    return combined;
  }
}

export class EventManager {
  // whether to output a warning when no promises are fulfilled
  warning = false;
  // event handlers
  handlers = {};
  // promises that get triggered by handlers
  promises = {};
  // promise that external promises will race against
  abortPromise = ManagedPromise.create(this);
  // proxy yielding handler-creating functions
  on = new Proxy({}, { get: (_, name) => this.getHandler(name), set: throwError });
  // proxy yielding promises, which is callable itself
  eventual = new Proxy(
    (name, promise) => this.abortPromise.combineWithExternal('or', name, promise),
    { get: (_, name) => this.getPromise(name), set: throwError }
  );
  // inspector used to log events
  inspector = null;
  // report occurrence of await
  onAwaitStart = null;
  onAwaitEnd = null;

  constructor(options) {
    const {
      warning = false,
      signal,
      inspector,
      onAwaitStart,
      onAwaitEnd,
    } = options;
    this.warning = warning;
    this.inspector = inspector;
    this.onAwaitStart = onAwaitStart;
    this.onAwaitEnd = onAwaitEnd;
    // prevent unhandled error message
    this.abortPromise.catch(() => {});
    // attach listen to abort signal
    signal?.addEventListener('abort', () => this.abortAll(), { once: true });
  }

  getPromise(name) {
    if (typeof(name) !== 'string') {
      return;
    }
    const { promises } = this;
    let promise = promises[name];
    if (!promise) {
      promise = promises[name] = ManagedPromise.create(this, name);
    } else if (promise.state & STALE) {
      // an important value has just been picked up
      delete promises[name];
    }
    return promise;
  }

  getHandler(name) {
    if (typeof(name) !== 'string') {
      return;
    }
    const { handlers } = this;
    let handler = handlers[name];
    if (!handler) {
      handler = handlers[name] = (value) => this.settlePromise(name, value);
      const valueHandlers = { hash: null, map: null };
      handler.bind = (...args) => {
        const value = (args.length < 2) ? args[0] : args[1];
        return this.getValueHandler(name, valueHandlers, value);
      };
      const applyFn = handler.apply;
      const filterHandlers = { map: null };
      handler.apply = (...args) => {
        if (args.length !== 1 || typeof(args[0]) !== 'function') {
          return applyFn.call(handler, ...args);
        } else {
          return this.getApplyHandler(name, filterHandlers, args[0]);
        }
      };
    }
    return handler;
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
        handler = () => this.settlePromise(name, value);
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
        handler = () => this.settlePromise(name, value);
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
      handler = (value) => this.settlePromise(name, fn(value));
      handlers.map.set(fn, handler);
    }
    return handler;
  }

  settlePromise(name, value) {
    const { promises, warning } = this;
    let important = false, rejecting = false;
    for (;;) {
      if (value instanceof ImportantValue) {
        important = true;
        value = value.value;
      } else if (value instanceof ThrowableValue) {
        rejecting = true;
        value = value.value;
      } else {
        break;
      }
    }
    if (rejecting) {
      if (value?.type === 'error' && 'error' in value) {
        value = value.error;
      }
      if (!(value instanceof Error)) {
        value = new Error(value);
      }
    }
    let handled = false;
    let promise = promises[name];
    if (!promise && important) {
      // allow the value to be picked up later
      promises[name] = promise = ManagedPromise.create(this, name);
      promise.state |= STALE;
    }
    if (promise) {
      if (rejecting) {
        promise.reject(value);
      } else {
        const obj = {};
        obj[name] = value;
        promise.resolve(obj);
      }
      handled = true;
    }
    if (this.inspector) {
      const type = (rejecting) ? 'reject' : 'fulfill';
      this.inspector.dispatch({ type, name, value, handled });
    } else if (!handled && warning && process.env.NODE_ENV === 'development') {
      console.warn(`No promise was fulfilled by call to on.${name}()`);
    }
  }

  reportAwaitStart(promise) {
    if (this.inspector) {
      this.inspector.dispatch({ type: 'await', promise });
    } else if (this.warning && process.env.NODE_ENV === 'development') {
      const { state, name } = promise;
      if (!(state & DERIVED)) {
        if (!(name in this.handlers)) {
          console.warn(`Awaiting eventual.${name} without prior use of on.${name}`);
        }
      }
    }
    this.onAwaitStart?.();
  }

  reportAwaitEnd(promise) {
    this.onAwaitEnd?.();
  }

  reportSettlement(promise) {
    const { promises } = this;
    const { state, name } = promise;
    if (!(state & DERIVED) && !(state & STALE)) {
      delete promises[name];
    }
  }

  abortAll() {
    const err = new Abort('Abort');
    for (const promise of Object.values(this.promises)) {
      promise.reject(err);
    }
    this.abortPromise.reject(err);
  }
}

export function important(value) {
  return new ImportantValue(value);
}

export function throwing(value) {
  return new ThrowableValue(value);
}

class ImportantValue {
  constructor(value) {
    this.value = value;
  }
}

class ThrowableValue {
  constructor(value) {
    this.value = value;
  }
}

function throwError() {
  throw new Error('Property is read-only');
}
