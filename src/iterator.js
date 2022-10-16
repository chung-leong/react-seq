let delayMultiplier = 1;
let delayAddend = 0;

export function extendDelay(multiplier = 1, addend = 0) {
  delayMultiplier = multiplier;
  delayAddend = addend;
}

export class IntermittentIterator {
  constructor(delay = 0) {
    this.generator = null;
    this.promise = null;
    this.delay = delay;
    this.interval = 0;
    this.started = false;
    this.timeout = null;
    this.reject = null;
    this.returning = false;
  }

  setDelay(delay) {
    const actualDelay = (delay + delayAddend) * delayMultiplier;
    if (this.delay !== actualDelay) {
      this.delay = actualDelay;
      if (this.started) {
        this.stopTimer();
        this.startTimer();
        if (this.reject && this.delay === 0) {
          this.reject(new Interruption());
        }
      }
    }
  }

  start(generator) {
    this.generator = generator;
    this.started = true;
    this.startTimer();
  }

  next() {
    this.fetch();
    if (this.delay > 0) {
      return Promise.race([ this.promise, this.timeout ]);
    } else {
      // alternate behind the two
      this.returning = !this.returning;
      if (this.returning) {
        return Promise.race([ this.promise, this.timeout ]);
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
    this.timeout = null;
    this.reject = null;
    this.started = false;
    this.stopTimer();
    return generator.return();
  }

  startTimer() {
    if (this.delay > 0) {
      this.interval = setInterval(() => this.throw(new Interruption()), this.delay);
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
      });
    }
    if (!this.timeout) {
      this.timeout = new Promise((resolve, reject) => {
        this.reject = reject;
      });
      this.timeout.catch(() => {
        this.timeout = null;
        this.reject = null;
      });
    }
  }
}

export class Interruption extends Error {}
export class Abort extends Error {}
