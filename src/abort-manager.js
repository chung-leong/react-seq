import { Abort, nextTick, isPromise } from './utils.js';

export class AbortManager extends AbortController {
  constructor() {
    super();
    this.aborting = null;
    this.revert = null;
    this.apply = null;
    this.timeout = 0;
  }

  setTimeout(delay = 50) {
    // force abort
    this.timeout = setTimeout(() => this.abort(), delay);
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
    clearTimeout(this.timeout);
  }

  onUnmount() {
    let abort = true;
    this.revert?.call(null, { preventDefault: () => abort = false });
    if (abort) {
      this.aborting = nextTick(() => this.abort());
    }
  }
}
