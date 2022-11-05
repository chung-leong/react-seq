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
  // see if we've already tapped the target
  let { taps } = generator.next;
  if (!taps) {
    // need to install the tap
    const { next } = generator;
    let f;
    generator.next = f = async function() {
      let res, error;
      try {
        // get the result using the real function
        res = await next.call(this);
      } catch (err) {
        // shutdown the whole operation when an error is encountered
        res = { done: true };
        error = err;
      }
      // pass the result to the taps first
      for (const { resolve, buffer } of taps) {
        if (resolve) {
          // tap is waiting for data
          resolve(res);
        } else {
          buffer.push(res);
        }
      }
      // hand the result to the intended recipient
      if (error) {
        throw error;
      } else {
        return res;
      }
    };
    generator.next.taps = taps = [];
  }
  const tap = { resolve: null, buffer: [] };
  taps.push(tap);
  async function* create() {
    for (;;) {
      let res;
      if (tap.buffer.length > 0) {
        // there's data in the buffer still, yield that
        res = tap.buffer.shift();
      } else {
        // need to wait for the arrival of new information
        res = await new Promise(resolve => tap.resolve = resolve);
        // clear .resolve as soon as we get something
        tap.resolve = null;
      }
      const { value, done } = res;
      if (!done) {
        yield value;
      } else {
        break;
      }
    }
  }
  return create();
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
