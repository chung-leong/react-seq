export async function delay(ms, options = {}) {
  const {
    value,
    signal
  } = options;
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

export function isAbortError(err) {
  return err instanceof Error && (err.name === 'AbortError' || err.code === 20);
}

export class Abort extends Error {}
