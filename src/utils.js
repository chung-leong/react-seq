export async function delay(ms, options = {}) {
  const {
    value,
    signal
  } = options;
  if (signal?.aborted) {
    return Promise.reject(new Abort('Abort'));
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(value);
      signal?.removeEventListener('abort', listener);
    }, ms);
    const listener = () => {
      reject(new Abort('Abort'))
      clearTimeout(timeout);
    };
    signal?.addEventListener('abort', listener, { once: true });
  });
}

export async function meanwhile(fn) {
  try {
    if (fn) {
      await fn();
    }
  } catch (err) {
    if (!isAbortError(err)) {
      console.error(err);
    }
  }
}

export function createTrigger() {
  let pair;
  const promise = new Promise((...args) => pair = args)
  promise.resolve = pair[0];
  promise.reject = pair[1];
  return promise;
}

export function nextTick(fn) {
  return until(Promise.resolve(), fn);
}

export function timeout(delay, fn) {
  if (delay <= 0 || delay === Infinity) {
    return null;
  }
  const id = setTimeout(fn, delay);
  return { cancel: () => clearTimeout(id) };
}

export function interval(delay, fn) {
  if (delay <= 0 || delay === Infinity) {
    return null;
  }
  const id = setInterval(fn, delay);
  return { cancel: () => clearInterval(id) };
}

export function until(promise, fn) {
  if (!promise) {
    return null;
  }
  let canceled = false;
  promise.then(() => !canceled && fn(), () => {});
  return { cancel: () => canceled = true };
}

export function stasi(generator) {
  let sync;
  if (isSyncGenerator(generator)) {
    sync = true;
  } else if (isAsyncGenerator(generator)) {
    sync = false;
  } else {
    throw new Error('Not a generator');
  }
  const desc0 = Object.getOwnPropertyDescriptor(generator, 'next') ?? {
    enumerable: false,
    configurable: true,
    writable: true,
  };
  let nextS;
  function attachNext(gen) {
    const desc = { ...desc0, value: nextS };
    Object.defineProperty(gen, 'next', desc);
  }
  let ctx = generator.next.stasi;
  if (ctx) {
    nextS = generator.next;
  } else {
    // target generator at index = 0
    ctx = { generators: [ generator ], queues: [ [] ], promise: null };

    // place result into all queues
    function push(res) {
      const q0 = ctx.queues[0];
      if (res instanceof Error) {
        for (const q of ctx.queues) {
          // statsi generators don't throw
          q.push(q === q0 ? res : { done: true, value: undefined });
        }
      } else if (!res.done && (isAsyncGenerator(res.value) || isSyncGenerator(res.value))) {
        for (const q of ctx.queues) {
          // stasi generators receive new stasi generators
          q.push(q === q0 ? res : { done: false, value: stasi(res.value) });
        }
      } else {
        // all generators receive the same value
        for (const q of ctx.queues) {
          q.push(res);
        }
      }
    }
    function pull(queue) {
      const res = queue.shift();
      if (res instanceof Error) {
        throw res;
      }
      return res;
    }
    // create next function that pull from the queues
    const next0 = generator.next;
    if (sync) {
      nextS = function next() {
        const index = ctx.generators.indexOf(this);
        const queue = ctx.queues[index];
        if (queue.length === 0) {
          try {
            push(next0.call(ctx.generators[0]));
          } catch (err) {
            push(err);
          }
        }
        return pull(queue);
      };
    } else {
      nextS = async function next() {
        const index = ctx.generators.indexOf(this);
        const queue = ctx.queues[index];
        if (queue.length === 0) {
          // don't do anything except to wait if a fetch has already commenced
          let fetching = !ctx.promise;
          if (fetching) {
            ctx.promise = next0.call(ctx.generators[0]);
          }
          let res;
          try {
            res = await ctx.promise;
          } catch (err) {
            res = err;
          }
          if (fetching) {
            push(res);
            ctx.promise = null;
          }
        }
        return pull(queue);
      };
    }
    nextS.stasi = ctx;
    attachNext(generator);
  }
  // create empty generator and attach .next()
  const genS = (sync) ? (function*(){})() : (async function*(){})();
  attachNext(genS);
  ctx.generators.push(genS);
  ctx.queues.push([]);
  return genS;
}

export async function* linearize(generator) {
  const stack = [ generator ];
  let source = null;
  try {
    for(;;) {
      if (!source) {
        source = stack.pop();
        if (!source) {
          break;
        }
      }
      const { done, value } = await source.next();
      if (!done) {
        if (isAsyncGenerator(value)) {
          stack.push(source);
          source = value;
        } else {
          yield value;
        }
      } else {
        source = null;
      }
    }
  } finally {
    if (source) {
      await source.return();
    }
  }
}

export function isPromise(obj) {
  return (obj instanceof Object && typeof(obj) !== 'function' && typeof(obj.then) === 'function');
}

export function isAsyncGenerator(obj) {
  return obj instanceof Object && !!obj[Symbol.asyncIterator] && typeof(obj) !== 'function' && typeof(obj.next) === 'function';
}

export function isSyncGenerator(obj) {
  return obj instanceof Object && !!obj[Symbol.iterator] && typeof(obj) !== 'function' && typeof(obj.next) === 'function';
}

export function isAbortError(err) {
  return err instanceof Error && (err.name === 'AbortError' || err.code === 20);
}

export class Abort extends Error {}
