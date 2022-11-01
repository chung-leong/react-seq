import { Abort, nextTick, createTrigger } from './utils.js';

export class AbortManager extends AbortController {
  constructor() {
    super();
    this.mounting = null;
    this.aborting = null;
    this.preclusion = createTrigger();
  }

  // when strict mode is used, the component will get mounted twice in rapid succession
  // we can't abort immediately on unmount, as the component can be remount immediately
  // schedule the operation on the next tick instead so there's a window of opportunity
  // to cancel it
  onUnmount() {
    this.mounting?.cancel();
    this.aborting = nextTick(() => {
      this.abort();
      this.preclusion.reject(new Abort('Unmount'));
    })
  }

  onMount() {
    this.aborting?.cancel();
    this.mounting = nextTick(() => {
      this.preclusion.resolve();
    })
  }

  timeout(delay = 50) {
    // force unmount event
    const timeout = setTimeout(() => this.onUnmount(), delay);
    const cancel = () => clearTimeout(timeout);
    // cancel when it becomes clear whether an abort will occur
    this.preclusion.then(cancel, cancel);
  }
}
