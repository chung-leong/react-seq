import { nextTick, timeout, until, createTrigger } from './utils.js';
import { setting } from './settings.js';

export class AbortManager extends AbortController {
  // scheduled abort
  aborting = null;
  // scheduled fulfillment of promise mounted
  mounting = null;
  // scheduled resetting of mounting
  unmounting = null;
  // promise that the component is mounted
  mounted = createTrigger();
  // effect function
  apply = null;
  // clean-up function returned by apply
  revert = null;

  setSelfDestruct() {
    if (process.env.NODE_ENV === 'development') {
      // deal with double invocatopn in strict mode during development by self-destructing
      // when not immediately mounted
      const delay = setting('strict_mode_clean_up');
      if (!isNaN(delay)) {
        if (delay === 0) {
          this.aborting = nextTick(() => this.abort());
        } else {
          this.aborting = timeout(delay, () => this.abort());
        }
      }
    }
  }

  setEffect(fn) {
    this.apply = fn;
  }

  // when strict mode is used, the component will get mounted twice in rapid succession
  // we can't abort immediately on unmount, as the component can be remount immediately
  // schedule the operation on the next tick instead so there's a window of opportunity
  // to cancel it
  onMount() {
    // cancel abort (if any)
    this.aborting?.cancel();
    this.unmounting?.cancel();
    this.mounting = nextTick(() => this.mounted.resolve());

    // call effect function if there's one
    const result = this.apply?.();
    if (typeof(result) === 'function') {
      this.revert = result;
    }
  }

  onUnmount() {
    // cancel mounting
    this.mounting?.cancel();
    this.unmounting = nextTick(() => this.mounted = createTrigger());

    // run clean-up function
    let abortDelay, abortPromise, abortCanceled = false, abortCount = 0;
    function check() {
      if (abortCount > 0) {
        throw new Error('keep(), keepFor(), and keepUntil() cannot be used at the same time');
      }
      abortCount++;
    }
    this.revert?.({
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
