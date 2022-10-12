let delayMultiplier = 1;
let delayAddend = 0;

export function extendDelay(multiplier = 1, addend = 0) {
  delayMultiplier = multiplier;
  delayAddend = addend;
}

export class TimedIterator {
  constructor() {
    this.generator = null;
    this.promise = null;
    this.delay = 0;
    this.interval = 0;
    this.started = false;
    this.timeout = null;
    this.reject = null;
    this.returning = false;
  }

  start(generator) {
    this.generator = generator;
    this.started = true;
    this.startTimer();
  }

  stop() {
    this.stopTimer();
    this.promise = null;
    this.timeout = null;
    this.reject = null;
    this.started = false;
    this.generator.return().catch((err) => {
      console.error(err);
    });
    this.generator = null;
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

  startTimer() {
    if (this.delay > 0) {
      this.interval = setInterval(() => {
        if (this.reject) {
          this.reject(new Interruption());
        }
      }, this.delay);
    }
    this.started = true;
  }

  stopTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = 0;
    }
    this.started = false;
  }

  fetch() {
    if (!this.promise) {
      this.promise = this.generator.next()
      this.promise.then(() => {
        this.promise = null;
      });
    }
    if (!this.timeout) {
      if (this.delay > 0) {
        this.timeout = new Promise((resolve, reject) => {
          this.reject = reject;
        });
      } else {
        this.timeout = Promise.reject(new Interruption());
      }
      this.timeout.catch(() => {
        this.timeout = null;
        this.reject = null;
      });
    }
  }

  next() {
    this.fetch();
    if (this.delay > 0) {
      return Promise.race([ this.promise, this.timeout ]);
    } else {
      // alternate behind the two
      this.returning = !this.returning;
      return (this.returning) ? this.promise : this.timeout;
    }
  }
}

export class Interruption extends Error {}
