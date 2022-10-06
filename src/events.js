export function manageEvents(options = {}) {
  const {
    warning = false,
  } = options;
  const cxt = {
    warning,
    builders: {},
    promises: {},
    resolves: {},
    eventual: null,
    trigger: null,
  };
  cxt.eventual = new Proxy(cxt, { get: getPromise });
  cxt.trigger = new Proxy(cxt, { get: getTriggerBuilders });
  return [ cxt.trigger, cxt.eventual ];
}

function getPromise(cxt, name) {
  let promise = cxt.promises[name];
  if (!promise) {
    let resolve;
    cxt.promises[name] = promise = new Promise(r => resolve = r);
    cxt.resolves[name] = resolve;
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
  const cxt = { promises, op, eventual };
  return new Proxy(cxt, { get: getMergedPromise })
}

const promiseMergeMethods = { or: 'race', and: 'all' };

function getMergedPromise(cxt, name) {
  const { eventual, promises, op } = cxt;
  // obtain the last promise in the chain
  const lastPromise = eventual[name];
  // merge it with the ones earlier in the chain
  const promiseList = [ ...promises, lastPromise ];
  const method = promiseMergeMethods[op];
  const merge = Promise[method];
  const mergedPromise = merge.call(Promise, promiseList);
  // allow further chaining (but only of the same operation)
  mergedPromise[op] = enablePromiseMerge(cxt, promiseList, op);
  return mergedPromise;
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
        if (process.NODE_DEV === 'development') {
          // TODO: check if value is a React SyntheticEvent during development
          // to warn  developers when the trigger builder is passed as the handler
          // instead of it being called to create the handler (i.e. missing parantheses)
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
  const { promises, resolves, warning } = cxt;
  const resolve = resolves[name];
  if (resolve) {
    resolve(value);
    // remove the promise once it fulfill so a new one will be created later
    delete promises[name];
    delete resolves[name];
  }
  if (!resolve && warning) {
    console.warn(`No promise was fulfilled by call to handler created by ${name}()`);
  }
}
