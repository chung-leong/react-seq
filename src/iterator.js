import { Abort, timeout, interval } from './utils.js';

let delayMultiplier = 1;
let delayLimit = Infinity;

export function extendDelay(multiplier) {
  if (multiplier !== undefined) {
    delayMultiplier = multiplier;
  }
  return delayMultiplier;
}

export function limitTimeout(limit) {
  if (limit !== undefined) {
    delayLimit = limit;
  }
  return delayLimit;
}

export class IntermittentIterator {
  constructor(options) {
    const {
      signal
    } = options;
    this.generator = null;
    this.promise = null;
    this.delay = 0;
    this.limit = delayLimit;
    this.interval = null;
    this.timeout = null;
    this.started = false;
    this.pending = true;
    this.tick = null;
    this.reject = null;
    this.error = null;
    signal?.addEventListener('abort', () => this.throw(new Abort()), { once: true });
  }

  setDelay(delay) {
    const actualDelay = (delay === 0) ? 0 : delay * delayMultiplier;
    if (actualDelay !== this.delay) {
      this.delay = actualDelay;
      if (this.started) {
        this.interval?.cancel();
        this.interval = interval(this.delay, () => this.interrupt());
      }
    }
  }

  setLimit(limit) {
    const actualLimit = Math.min(limit, delayLimit);
    if (actualLimit !== this.limit) {
      this.limit = actualLimit;
      if (this.started && this.pending) {
        this.timeout?.cancel();
        this.timeout = timeout(this.limit, () => this.throw(new Timeout()));
      }
    }
  }

  start(generator) {
    this.generator = generator;
    this.started = true;
    this.interval = interval(this.delay, () => this.interrupt());
    this.timeout = timeout(this.limit, () => this.throw(new Timeout()));
  }

  next() {
    this.fetch();
    return Promise.race([ this.promise, this.tick ]);
  }

  throw(err) {
    if (this.reject) {
      this.reject(err);
    } else {
      this.error = err;
    }
  }

  interrupt() {
    this.throw(new Interruption());
  }

  async return() {
    const { generator } = this;
    this.interval?.cancel();
    this.timeout?.cancel();
    // just in case we're returning prior to next() getting called
    this.promise?.catch(err => {});
    return generator.return();
  }

  fetch() {
    if (!this.promise && this.generator) {
      this.promise = this.generator.next()
      this.promise.then(() => {
        this.promise = null;
        this.pending = false;
        if (this.timeout) {
          // we got something, turn off the timeout
          this.timeout.cancel();
          this.timeout = null;
        }
      }, err => {});
    }
    if (!this.tick && this.generator) {
      if (this.error) {
        this.tick = Promise.reject(this.error);
        this.error = null;
      } else {
        this.tick = new Promise((_, reject) => {
          this.reject = reject;
        });
      }
      this.tick.catch(() => {
        this.tick = null;
        this.reject = null;
      });
    }
  }
}

export class Interruption extends Error {}
export class Timeout extends Error {}
