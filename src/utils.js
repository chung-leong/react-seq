export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function preload(f) {
  try {
    await f();
  } catch (err) {
    if (!isFetchAbort(err)) {
      console.error(err);
    }
  }
}

export function when(cond, el) {
  if (cond) {
    if (typeof(el) === 'function') {
      el = el();
    }
    if (process.env.NODE_ENV === 'development') {
      if (el instanceof Promise) {
        console.warn('when() is returning a promise, indicating an async function being used in the wrong context');
      }
    }
    return el;
  }
}

export function isFetchAbort(err) {
  return err.constructor.name === 'DOMException' && (err.name === 'AbortError' || err.code === 20);
}
