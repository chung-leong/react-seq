export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
