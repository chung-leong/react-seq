import { Abort, timeout, interval } from './utils.js';

export class IntermittentIterator {
  generator = null;
  promise = null;
  delay = 0;
  limit = Infinity;
  interval = null;
  timeout = null;
  started = false;
  pending = true;
  retrieving = false;
  tick = null;
  reject = null;

  constructor(options) {
    const {
      signal
    } = options;
    signal?.addEventListener('abort', () => this.abort(), { once: true });
  }

  setInterruption(delay) {
    if (delay !== this.delay) {
      this.delay = delay;
      if (this.started) {
        this.interval?.cancel();
        this.interval = interval(this.delay, () => this.interrupt());
      }
    }
  }

  setTimeLimit(limit) {
    if (limit !== this.limit) {
      this.limit = limit;
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
    this.retrieving = true;
    return Promise.race([ this.promise, this.tick ]);
  }

  throw(err) {
    if (this.reject) {
      this.reject(err);
    } else {
      this.tick = Promise.reject(err);
    }
  }

  abort() {
    if (this.retrieving) {
      // next() has been called--terminate the loop
      this.throw(new Abort());
    } else {
      // next() has not been called
      this.return().catch(() => {});
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
