import { nextTick, timeout, until } from './utils.js';

export class AbortManager extends AbortController {
  constructor() {
    super();
    this.aborting = null;
    this.revert = null;
    this.apply = null;
  }

  setTimeout(delay = 250) {
    // force abort
    this.aborting = timeout(delay, () => this.abort());
  }

  setEffect(fn) {
    this.apply = fn;
  }

  // when strict mode is used, the component will get mounted twice in rapid succession
  // we can't abort immediately on unmount, as the component can be remount immediately
  // schedule the operation on the next tick instead so there's a window of opportunity
  // to cancel it
  onMount() {
    const result = this.apply?.call(null);
    if (typeof(result) === 'function') {
      this.revert = result;
    }
    this.aborting?.cancel();
  }

  onUnmount() {
    let abortDelay, abortPromise, abortCanceled = false, abortCount = 0;
    function check() {
      if (abortCount > 0) {
        throw new Error('keep(), keepFor(), and keepUntil() cannot be used at the same time');
      }
      abortCount++;
    }
    debugger;
    this.revert?.call(null, {
      keep() {
        check();
        abortCanceled = true;
      },
      keepFor(delay) {
        check();
        abortDelay = delay;
      },
      keepUntil(promise) {
        check();
        abortPromise = promise;
      },
    });
    if (abortDelay) {
      this.aborting = timeout(abortDelay, () => this.abort());
    } else if (abortPromise) {
      this.aborting = until(abortPromise, () => this.abort());
    } else if (!abortCanceled) {
      this.aborting = nextTick(() => this.abort());
    }
  }
}
