import { Abort, isAbortError } from './abort-manager.js';

export async function delay(ms, options = {}) {
  const {
    value,
    signal
  } = options;
  if (signal && signal.aborted) {
    return Promise.reject(new Abort('Abort'));
  }
  return new Promise((resolve, reject) => {
    let callback;
    const timeout = setTimeout(() => {
      resolve(value);
      if (callback) {
        signal.removeEventListener('abort', callback);
      }
    }, ms);
    if (signal) {
      callback = () => {
        reject(new Abort('Abort'))
        clearTimeout(timeout);
      };
      signal.addEventListener('abort', callback, { once: true });
    }
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

export function isAsync(obj) {
  return isPromise(obj) || isGenerator(obj);
}

export function isPromise(obj) {
  return (obj instanceof Object && typeof(obj.then) === 'function');
}

export function isGenerator(obj) {
  return (obj instanceof Object && typeof(obj.next) === 'function');
}
