export async function delay(ms, options = {}) {
  const {
    value,
    signal
  } = options;
  if (signal?.aborted) {
    return Promise.reject(new Abort('Abort'));
  }
  return new Promise((resolve, reject) => {
    let callback;
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

export function nextTick(fn) {
  let cancelled = false;
  const promise = Promise.resolve().then(() => {
    if (!cancelled) {
      return fn();
    }
  });
  return { promise, cancel: () => cancelled = true };
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
  let ctx = generator.next.stasi;
  let nextS;
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
    generator.next = nextS;
  }
  // create empty generator and attach .next()
  const genS = (sync) ? (function*(){})() : (async function*(){})();
  genS.next = nextS;
  ctx.generators.push(genS);
  ctx.queues.push([]);
  return genS;
}

export function isPromise(obj) {
  return (obj instanceof Object && typeof(obj.then) === 'function');
}

export function isAsyncGenerator(obj) {
  return obj instanceof Object && !!obj[Symbol.asyncIterator] && typeof(obj.next) === 'function';
}

export function isSyncGenerator(obj) {
  return obj instanceof Object && !!obj[Symbol.iterator] && typeof(obj.next) === 'function';
}

export function isAbortError(err) {
  return err instanceof Error && (err.name === 'AbortError' || err.code === 20);
}

export class Abort extends Error {}
