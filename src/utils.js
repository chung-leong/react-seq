export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function preload(fn) {
  try {
    await fn();
  } catch (err) {
    if (!isFetchAbort(err)) {
      console.error(err);
    }
  }
}

export function isFetchAbort(err) {
  return err.constructor.name === 'DOMException' && (err.name === 'AbortError' || err.code === 20);
}
