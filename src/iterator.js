let delayMultiplier = 1;
let delayLimit = Infinity;

export function extendDeferment(multiplier = 1) {
  delayMultiplier = multiplier;
}

export function limitDeferment(limit = 1) {
  delayLimit = limit;
}

export class IntermittentIterator {
  constructor(signal) {
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
    signal.addEventListener('abort', () => this.throw(new Abort()), { once: true });
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
    if (this.interval) {
      return Promise.race([ this.promise, this.tick ]);
    } else {
      // alternate behind the two
      this.returning = !this.returning;
      if (this.returning) {
        return Promise.race([ this.promise, this.tick ]);
      } else {
        return Promise.reject(new Interruption());
      }
    }
  }

  throw(err) {
    if (this.reject) {
      this.reject(err);
    }
  }

  return() {
    const { generator } = this
    this.generator = null;
    this.promise = null;
    this.tick = null;
    this.reject = null;
    this.started = false;
    this.pending = true;
    this.stopTimer();
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
      });
    }
    if (!this.tick) {
      this.tick = new Promise((resolve, reject) => {
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
export class Abort extends Error {}
