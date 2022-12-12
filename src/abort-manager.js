import { nextTick, timeout, until, createTrigger } from './utils.js';

export class AbortManager extends AbortController {
  // scheduled abort
  aborting = null;
  // scheduled fulfillment of promise mounted
  mounting = null;
  // scheduled resetting of mounting
  unmounting = null;
  // promise that the component is mounted
  mounted = createTrigger();
  // boolean indicating whether component is mounted
  mountState = false;
  // effect function
  apply = null;
  // clean-up function returned by apply
  revert = null;

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
    this.mountState = true;

    // call effect function if there's one
    const result = this.apply?.();
    this.revert = (typeof(result) === 'function') ? result : null;
  }

  onUnmount() {
    // cancel mounting
    this.mounting?.cancel();
    this.mountState = false;
    this.unmounting = nextTick(() => this.mounted = createTrigger());
    this.aborting = nextTick(() => this.abort());
    this.revert?.();
  }
}
