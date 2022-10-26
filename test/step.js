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
          promise.done = () => setTimeout(() => resolve(), delay);
          promise.fail = (err) => setTimeout(() => reject(err), delay);
        }
        return promise;
      }
    }
  });
}
