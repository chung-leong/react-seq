import { Abort } from './iterator.js';

export function createEventManager(signal, options) {
  const {
    warning = false,
  } = options;
  const cxt = {
    // whether to output a warning when no promises are fulfilled
    warning,
    // event handlers
    handlers: {},
    // promises that get triggered by handlers
    promises: {},
    // resolve functions of promises
    resolves: {},
    // reject functions of promises
    rejects: {},
    // proxy yielding handler-creating functions
    on: null,
    // proxy yielding promises
    eventual: null,
  };
  cxt.eventual = new Proxy(cxt, { get: getPromise, set: throwError });
  cxt.on = new Proxy(cxt, { get: getHandler, set: throwError });
  signal.addEventListener('abort', () => rejectAll(cxt, new Abort()), { once: true });
  return cxt;
}

function getPromise(cxt, name) {
  const { promises, resolves, rejects } = cxt;
  let promise = promises[name];
  if (!promise) {
    promises[name] = promise = new Promise((resolve, reject) => {
      resolves[name] = resolve;
      rejects[name] = reject;
    });
    // allow multiple promises to be chained together
    // promise from an 'or' chain fulfills when the quickest one fulfills
    promise.or = enablePromiseMerge(cxt, promise, [ promise ], 'or');
    // promise from an 'add' chain fulfills when all promises do
    promise.and = enablePromiseMerge(cxt, promise, [ promise ], 'and');
  }
  return promise;
}

function enablePromiseMerge(parentCxt, parentPromise, promises, op) {
  const { eventual } = parentCxt;
  // the context itself is callable
  const cxt = Object.assign((promise) => {
    const promiseList = [ ...promises, promise ];
    const mergedPromise = mergePromises(promiseList, op);
    mergedPromise[op] = enablePromiseMerge(cxt, mergedPromise, promiseList, op);
    // see comment below
    if (!promiseList.includes(parentPromise)) {
      parentPromise.catch(err => {});
    }
    return mergedPromise;
  }, { promises, parentPromise, op, eventual });
  return new Proxy(cxt, { get: getMergedPromise, set: throwError })
}

function getMergedPromise(cxt, name) {
  const { eventual, parentPromise, promises, op } = cxt;
  // obtain the last promise in the chain
  const lastPromise = eventual[name];
  // merge it with the ones earlier in the chain
  const promiseList = [ ...promises, lastPromise ];
  const mergedPromise = mergePromises(promiseList, op);
  // allow further chaining (but only of the same operation)
  mergedPromise[op] = enablePromiseMerge(cxt, mergedPromise, promiseList, op);
  // if the parent promise will wind up outside the chain,
  // put a catch on it so won't be regarded as orphaned
  if (!promiseList.includes(parentPromise)) {
    parentPromise.catch(err => {});
  }
  return mergedPromise;
}

const promiseMergeMethods = { or: 'race', and: 'all' };

function mergePromises(promiseList, op) {
  const method = promiseMergeMethods[op];
  const merge = Promise[method];
  return merge.call(Promise, promiseList);
}

function getHandler(cxt, name) {
  const { handlers } = cxt;
  let handler = handlers[name];
  if (!handler) {
    const fn = (value) => triggerFulfillment(cxt, name, value);
    const valueHandlers = { hash: null, map: null };
    handlers[name] = handler = new Proxy(fn, {
      get: (fn, key) => getHandlerProp(cxt, fn, name, valueHandlers, key),
      set: throwError,
    });
    fn.bind = (...args) => {
      const value = (args.length < 2) ? args[0] : args[1];
      return getValueHandler(cxt, fn, name, valueHandlers, value);
    };
  }
  return handler;
}

function getHandlerProp(cxt, fn, name, handlers, key) {
  let value = fn[key];
  if (value !== undefined) {
    // return properties of function
    return value;
  } else {
    return getValueHandler(cxt, fn, name, handlers, key);
  }
}

function getValueHandler(cxt, fn, name, handlers, value) {
  let handler;
  if (value instanceof Object) {
    if (!handlers.map) {
      handlers.map = new WeakMap();
    }
    handler = handlers.map.get(value);
    if (!handler) {
      handler = () => triggerFulfillment(cxt, name, value);
      handlers.map.set(value, handler);
    }
  } else {
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
      handler = () => triggerFulfillment(cxt, name, value);
      handlers.hash[key] = handler;
    }
  }
  return handler;
}

function triggerFulfillment(cxt, name, value) {
  const { promises, resolves, rejects, warning } = cxt;
  const resolve = resolves[name];
  if (resolve) {
    resolve(value);
    // remove the promise once it fulfill so a new one will be created later
    delete promises[name];
    delete resolves[name];
    delete rejects[name];
  }
  if (!resolve && warning) {
    console.warn(`No promise was fulfilled by call to handler created by ${name}()`);
  }
}

function rejectAll(cxt, err) {
  const { promises, resolves, rejects } = cxt;
  for (const [ name, reject ] of Object.entries(rejects)) {
    reject(err);
    delete promises[name];
    delete resolves[name];
    delete rejects[name];
  }
}

function throwError() {
  throw new Error('Property is read-only');
}

if (typeof(window) === 'object') {
  // suppress error message about unhandle rejection when it's an Abort error
  // shouldn't really happen
  window.addEventListener('unhandledrejection', (evt) => {
    if (evt.reason instanceof Abort) {
      evt.preventDefault();
    }
  });
}
