export function createEventManager(options) {
  const {
    warning = false,
  } = options;
  const cxt = {
    // whether to output a warning when no promises are fulfilled
    warning,
    // functions for creating event handlers
    builders: {},
    // promises that get triggered by handlers
    promises: {},
    // resolve functions of promises
    resolves: {},
    // reject functions of promises
    rejects: {},
    // function for rejecting all promises
    reject: (err) => rejectAll(cxt, err),
    // proxy yielding handler-creating functions
    on: null,
    // proxy yielding promises
    eventual: null,
  };
  cxt.eventual = new Proxy(cxt, { get: getPromise, set: throwError });
  cxt.on = new Proxy(cxt, { get: getTriggerBuilders, set: throwError });
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
    promise.or = enablePromiseMerge(cxt, [ promise ], 'or');
    // promise from an 'add' chain fulfills when all promises do
    promise.and = enablePromiseMerge(cxt, [ promise ], 'and');
  }
  return promise;
}

function enablePromiseMerge(parentCxt, promises, op) {
  const { eventual } = parentCxt;
  // the context itself is callable
  const cxt = Object.assign((promise) => {
    const promiseList = [ ...promises, promise ];
    const mergedPromise = mergePromises(promiseList, op);
    mergedPromise[op] = enablePromiseMerge(cxt, promiseList, op);
    return mergedPromise;
  }, { promises, op, eventual });
  return new Proxy(cxt, { get: getMergedPromise, set: throwError })
}

function getMergedPromise(cxt, name) {
  const { eventual, promises, op } = cxt;
  // obtain the last promise in the chain
  const lastPromise = eventual[name];
  // merge it with the ones earlier in the chain
  const promiseList = [ ...promises, lastPromise ];
  const mergedPromise = mergePromises(promiseList, op);
  // allow further chaining (but only of the same operation)
  mergedPromise[op] = enablePromiseMerge(cxt, promiseList, op);
  return mergedPromise;
}

const promiseMergeMethods = { or: 'race', and: 'all' };

function mergePromises(promiseList, op) {
  const method = promiseMergeMethods[op];
  const merge = Promise[method];
  return merge.call(Promise, promiseList);
}

function getTriggerBuilders(cxt, name) {
  const { builders } = cxt;
  let builder = builders[name];
  if (!builder) {
    builders[name] = builder = (...args) => {
      if (args.length > 1) {
        throw new TypeError(`Cannot create a handler accepting ${args.length} parameters`);
      }
      if (args.length === 1) {
        // promise will fulfill with value given to the builder
        const [ value ] = args;
        if (process.env.NODE_ENV === 'development') {
          // check if value is a React SyntheticEvent during development
          // to warn developers when the handler builder is passed as the handler
          // instead of it being called to create the handler (i.e. missing parantheses)
          if (value instanceof Object && value.nativeEvent) {
            console.warn(`${name}() received a React SyntheticEvent as fulfillment value. Perhaps you have neglected to invoke it?`);
          }
        }
        return () => triggerFulfillment(cxt, name, value);
      } else {
        // promise will fulfill with value given to the handler
        return (value) => triggerFulfillment(cxt, name, value);
      }
    };
  }
  return builder;
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
