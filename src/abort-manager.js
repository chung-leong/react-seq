export class AbortManager extends AbortController {
  constructor() {
    super();
    this.abortPromise = null;
    this.abortCancelled = false;
    this.mountPromise = null;
    this.mountCancelled = false;

    this.disavowPromise = null;
    this.disavowResolve = null;
    this.disavowReject = null;
  }

  // when strict mode is used, the component will get mounted twice in rapid succession
  // we can't abort immediately on unmount, as the component can be remount immediately
  // schedule the operation on the next tick instead so there's a window of opportunity
  // to cancel it
  schedule() {
    if (this.mountPromise) {
      this.mountCancelled = true;
    }
    if (!this.abortPromise) {
      this.abortPromise = Promise.resolve().then(() => {
        this.abortPromise = null;
        if (!this.abortCancelled) {
          this.abort();
          if (this.disavowReject) {
            this.disavowReject();
          }
        }
      })
    }
    this.abortCancelled = false;
  }

  unschedule() {
    if (this.abortPromise) {
      this.abortCancelled = true;
    }
    if (!this.mountPromise) {
      this.mountPromise = Promise.resolve().then(() => {
        this.mountPromise = null;
        if (!this.mountCancelled) {
          if (this.disavowResolve) {
            this.disavowResolve();
          }
        }
      });
    }
    this.mountCancelled = false;
  }

  async disavow(delay = 50) {
    if (!this.disavowPromise) {
      let timeout;
      this.disavowPromise = new Promise((resolve, reject) => {
        this.disavowResolve = () => {
          clearTimeout(timeout);
          resolve();
        };
        this.disavowReject = () => {
          clearTimeout(timeout);
          reject(new Abort('Timeout'));
        };
        timeout = setTimeout(() => {
          this.abort();
          this.disavowReject();
        }, delay);
      });
      const clear = () => {
        this.disavowPromise = null;
        this.disavowResolve = null;
        this.disavowReject = null;
      };
      this.disavowPromise.then(clear, clear);
    }
    return this.disavowPromise;
  }
}

export function isAbortError(err) {
  return err instanceof Error && (err.name === 'AbortError' || err.code === 20);
}

export class Abort extends Error {}
