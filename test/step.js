export function createSteps(delay = 0) {
  return new Proxy([], {
    get(arr, name) {
      const num = parseInt(name);
      if (isNaN(num)) {
        return arr[name];
      } else {
        let promise = arr[num];
        if (!promise) {
          let resolve, reject;
          promise = arr[num] = new Promise((r1, r2) => { resolve = r1; reject = r2; });
          promise.done = (value) => setTimeout(() => resolve(value), delay);
          promise.fail = (err) => setTimeout(() => reject(err), delay);
          promise.throw = (err, value) => {
            setTimeout(() => resolve(value), delay);
            throw err;
          };
        }
        return promise;
      }
    }
  });
}

export async function loopThrough(steps, delay, fn) {
  let i = 0, interval = setInterval(() => steps[i++].done(), delay);
  try {
    await fn();
  } finally {
    clearInterval(interval);
  }
}
