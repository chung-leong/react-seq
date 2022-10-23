import { Abort } from './utils.js';

let delayMultiplier = 1;
let delayLimit = Infinity;

export function extendDeferment(multiplier = 1) {
  delayMultiplier = multiplier;
}

export function limitDeferment(limit = 1) {
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
    this.started = false;
    this.tick = null;
    this.period = this.limit;
    this.pending = true;
    this.reject = null;
    this.returning = false;
    if (signal) {
      signal.addEventListener('abort', () => this.throw(new Abort()), { once: true });
    }
  }

  setDelay(delay, limit = Infinity) {
    this.delay = delay * delayMultiplier;
    this.limit = Math.min(limit, delayLimit);
    this.updateTimer();
  }

  start(generator) {
    this.generator = generator;
    this.started = true;
    this.startTimer();
  }

  next() {
    this.fetch();
    // alternate behind returning and not returning when delay is zero
    this.returning = (this.delay > 0) || !this.returning;
    if (this.returning) {
      return Promise.race([ this.promise, this.tick ]);
    } else {
      return Promise.reject(new Interruption('Interruption'));
    }
  }

  throw(err) {
    if (!this.reject && this.generator) {
      this.fetch();
    }
    if (this.reject) {
      this.reject(err);
    }
  }

  async return() {
    const { generator } = this;
    this.stopTimer();
    if (this.promise) {
      this.promise.catch(err => {});
    }
    this.generator = null;
    this.promise = null;
    this.tick = null;
    this.reject = null;
    this.started = false;
    this.pending = true;
    return generator.return();
  }

  interrupt() {
    // throw Timeout instead of Interruption when nothing has been obtained yet
    if (this.pending) {
      this.pending = false;
      this.updateTimer();
      this.throw(new Timeout());
    } else {
      this.throw(new Interruption());
    }
  }

  updateTimer() {
    // set timer to limit for the arrival of the initial item first, then
    // trigger interruption based on the update delay
    const period = (this.pending) ? this.limit : this.delay;
    if (this.period !== period) {
      this.period = period;
      if (this.started) {
        this.stopTimer();
        this.startTimer();
        if (this.period === 0) {
          this.interrupt();
        }
      }
    }
  }

  startTimer() {
    if (this.period > 0 && this.period !== Infinity) {
      this.interval = setInterval(() => this.interrupt(), this.period);
    }
  }

  stopTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = 0;
    }
  }

  fetch() {
    if (!this.promise && this.generator) {
      this.promise = this.generator.next()
      this.promise.then(() => {
        this.promise = null;
        if (this.pending) {
          // we got something, switch timer to fire at the update delay
          this.pending = false;
          this.updateTimer();
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
