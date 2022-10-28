import { Abort } from './utils.js';

let delayMultiplier = 1;
let delayLimit = Infinity;

export function extendDelay(multiplier) {
  delayMultiplier = multiplier;
}

export function limitTimeout(limit) {
  delayLimit = limit;
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
    this.interval = 0;
    this.timeout = 0;
    this.expired = false;
    this.started = false;
    this.tick = null;
    this.reject = null;
    if (signal) {
      signal.addEventListener('abort', () => this.throw(new Abort()), { once: true });
    }
  }

  setDelay(delay) {
    const actualDelay = delay * delayMultiplier;
    if (actualDelay !== this.delay) {
      this.delay = actualDelay;
      if (this.started) {
        this.stopInterval();
        this.startInterval();
      }
    }
  }

  setLimit(limit) {
    const actualLimit = Math.min(limit, delayLimit);
    if (actualLimit !== this.limit) {
      this.limit = actualLimit;
      if (this.started) {
        this.stopTimeout();
        this.startTimeout();
      }
    }
  }

  start(generator) {
    this.generator = generator;
    this.started = true;
    this.startInterval();
    this.startTimeout();
  }

  next() {
    this.fetch();
    return Promise.race([ this.promise, this.tick ]);
  }

  throw(err) {
    if (this.reject) {
      this.reject(err);
    }
  }

  interrupt() {
    this.throw(new Interruption());
  }

  async return() {
    const { generator } = this;
    this.stopInterval();
    this.stopTimeout();
    if (this.promise) {
      // just in case we're returning prior to next() getting called
      this.promise.catch(err => {});
    }
    this.generator = null;
    this.promise = null;
    this.tick = null;
    this.reject = null;
    this.started = false;
    this.expired = false;
    return generator.return();
  }

  startInterval() {
    if (this.delay > 0 && this.delay !== Infinity) {
      this.interval = setInterval(() => this.interrupt(), this.delay);
    }
  }

  startTimeout() {
    if (this.limit > 0 && this.limit !== Infinity && !this.expired) {
      this.timeout = setTimeout(() => {
        this.throw(new Timeout());
        this.timeout = 0;
        this.expired = true;
      }, this.limit);
    }
  }

  stopInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = 0;
    }
  }

  stopTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = 0;
    }
  }

  fetch() {
    if (!this.promise && this.generator) {
      this.promise = this.generator.next()
      this.promise.then(() => {
        this.promise = null;
        if (this.timeout) {
          // we got something, turn off the timeout
          this.stopTimeout();
          this.expired = true;
        }
      }, err => {});
    }
    if (!this.tick && this.generator) {
      this.tick = new Promise((_, reject) => {
        this.reject = reject;
      });
      this.tick.catch(() => {
        this.tick = null;
        this.reject = null;
      });
    }
  }
}

export class Interruption extends Error {}
export class Timeout extends Error {}
