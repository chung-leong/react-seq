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

export async function preload(fn) {
  try {
    await fn();
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

export function createTrigger() {
  let resolve, reject;
  const promise = new Promise((r1, r2) => {
    resolve = r1;
    reject = r2;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

export function isAsync(obj) {
  return isPromise(obj) || isGenerator(obj);
}

export function isPromise(obj) {
  return (obj instanceof Object && typeof(obj.then) === 'function');
}

export function isGenerator(obj) {
  return (obj instanceof Object && typeof(obj.next) === 'function');
}

export function isAbortError(err) {
  return err instanceof Error && (err.name === 'AbortError' || err.code === 20);
}

export class Abort extends Error {}
