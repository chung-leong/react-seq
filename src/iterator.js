let delayMultiplier = 1;
let delayAddend = 0;

export function extendDelay(multiplier = 1, addend = 0) {
  delayMultiplier = multiplier;
  delayAddend = addend;
}

export class TimedIterator {
  constructor(delay = 0) {
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
    this.stopSource();
    this.promise = null;
    this.timeout = null;
    this.reject = null;
    this.started = false;
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

  stopSource() {
    this.generator.return().catch((err) => {
      console.error(err);
    });
    this.generator = null;
  }

  fetch() {
    if (!this.promise && this.generator) {
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

export class TimedPropsIterator extends TimedIterator {
  constructor(delay = Infinity) {
    super(delay);
    this.propList = [];
  }

  start(props, defaults, usables) {
    const list = this.propList;
    for (const [ name, value ] of Object.entries(props)) {
      let usable = usables[name];
      if (!usable) {
        // if the prop has a default value, then it's always usable
        if (defaults[name]) {
          usable = allow;
        }
      }
      if (isPromise(value)) {
        list.push({ name, usable, source: value, type: 'promise', resolved: false, promise: null, value: null });
      } else if (isAsyncGenerator(value)) {
        list.push({ name, usable, source: value, type: 'generator', resolved: false, promise: null, value: [] });
      } else {
        list.push({ name, usable, value, type: 'sync', resolved: true });
      }
    }
  }

  stopSource() {
    for(const p of this.propList) {
      if (p.type === 'generator') {
        try {
          let res = p.source.return();
          if (isPromise(res)) {
            res.catch((err) => {
              console.error(err);
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    this.propList = [];
  }

  fetch() {
    super.fetch();
    if (!this.promise) {
      const promises = [];
      this.propList.forEach(p => {
        if (p.type === 'sync') {
          return;
        }
        if (!p.resolved) {
          if (!p.promise) {
            if (p.type === 'promise') {
              p.promise = p.source.then((value) => {
                p.value = true;
                p.resolved = true;
                p.promise = null;
                return p.name;
              })
            } else if (p.type === 'generator') {
              let res = p.source.next();
              if (isPromise(res)) {
                p.promise = res.then(({ value, done }) => {
                  if (!done) {
                    p.value.push(value);
                  } else {
                    p.resolved = true;
                  }
                  p.promise = null;
                });
              } else {
                // pull everything from sync generator
                while (!res.done) {
                  p.value.push(res.value);
                  res = p.source.next();
                }
                p.resolved = true;
              }
            }
          }
          if (p.promise) {
            promises.push(p.promise);
          }
        }
      });
      if (promises.length > 0) {
        const promise = (promises.length === 1) ? promises[0] : Promise.race(promises);
        this.promise = promise.then(() => {
          const value = this.getUsableProps();
          return { value, done: false }
        });
      } else {
        this.promise = Promise.resolve({ value: undefined, done: true });
      }
      this.promise.then(() => {
        this.promise = null;
      })
    }
  }

  getUsableProps() {
    // check if all props are usable
    let unusable = false;
    for (const p of this.propList) {
      if (p.usable) {
        if (!p.usable(p.value)) {
          if (p.resolved) {
            throw new Error(`Props "${p.name}" is unusable even after having been fully resolved`);
          }
          unusable = true;
          break;
        }
      } else if (!p.resolved) {
        unusable = true;
        break;
      }
    }
    if (unusable) {
      return null;
    }
    const props = {};
    for (const p of this.propList) {
      props[p.name] = p.value;
    }
    return props;
  }
}

function allow() {
  return true;
}

function isPromise(obj) {
  if (obj instanceof Object) {
    if (typeof(obj.then) === 'function' && typeof(obj.catch) === 'function') {
      return true;
    }
  }
  return false;
}

function isAsyncGenerator(obj) {
  if (obj instanceof Object) {
    if (typeof(obj.next) === 'function' && typeof(obj.return) === 'function' && typeof(obj.throw) === 'function') {
      return true;
    }
  }
  return false;
}

export class Interruption extends Error {}
