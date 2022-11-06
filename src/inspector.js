import { createContext } from 'react';

export const InspectorContext = createContext();

export class Inspector {
  constructor() {
    this.listeners = [];
  }

  dispatch(evt) {
    const fired = [];
    for (const [ index, listener ] of this.listeners.entries()) {
      try {
        if (listener.match(evt)) {
          listener.resolve(evt);
          fired.unshift(index);
        }
      } catch (err) {
        listener.reject(err);
        fired.unshift(index);
      }
    }
    for (const index of fired) {
      this.listeners.splice(index, 1);
    }
    try {
      return this.onEvent(evt);
    } catch (err) {
      this.onError(err);
    }
  }

  occurrence(fn) {
    if (typeof(fn) !== 'function') {
      fn = createPredicate(fn);
    }
    const listener = { match: fn };
    listener.promise = new Promise((resolve, reject) => {
      listener.resolve = resolve;
      listener.reject = reject;
    });
    this.listeners.push(listener);
    return listener.promise;
  }

  onEvent(evt) {
  }

  onError(err) {
    console.error(err);
  }
}

function createPredicate(obj) {
  if (obj && !(obj instanceof Object)) {
    throw new TypeError('Invalid argument');
  }
  return (evt) => {
    for (const [ name, value ] of Object.entries(obj || {})) {
      if (evt[name] !== value) {
        return false;
      }
    }
    return true;
  };
}
