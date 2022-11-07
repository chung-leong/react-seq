import { createContext } from 'react';
import { Abort, timeout } from './utils.js';

export const InspectorContext = createContext();

export class Inspector {
  dispatch(evt) {
    try {
      return this.onEvent(evt);
    } catch (err) {
      this.onError(err);
    }
  }
  onEvent(evt) {}
  onError(err) {
    console.error(err);
  }
}

export class ConsoleLogger extends Inspector {
  startTime = new Date;

  onEvent(evt) {
    const l = (s) => {
      const now = new Date;
      const elapsed = ((now - this.startTime)).toFixed(3).padStart(8, ' ');
      console.log(`[${elapse}s] ` + s);
    }
    switch (evt.type) {
      case 'await':
        l(`Awaiting eventual ${evt.name}`);
        break;
      case 'fulfill':
        l(`Fulfillment of ${evt.name} with ${evt.value}`);
        break;
      case 'reject':
        l(`Rejection of ${evt.name} with ${evt.value.name}`);
        break;
      case 'state':
        l(`State update`);
        break;
      case 'content':
        l(`Content update`);
        break;
      case 'error':
        l(`Error thrown (${evt.error.name})`);
        break;
      case 'abort':
        l(`Generator aborted`);
        break;
      case 'timeout':
        l(`Timeout after ${evt.duration} milliseconds`);
        break;
      default:
    }
  }
}

export class PromiseLogger extends Inspector {
  listeners = [];
  eventLog = [];

  oldEvents = (predicate) => {
    const match = this.prepareMatch(predicate);
    return this.eventLog.filter(match);
  }

  oldEvent = (predicate) => {
    return this.oldEvents(predicate).pop();
  }

  newEvent = (predicate, timeLimit) => {
    const match = this.prepareMatch(predicate);
    const listener = { match };
    listener.promise = new Promise((resolve, reject) => {
      listener.resolve = resolve;
      listener.reject = reject;
    });
    this.listeners.push(listener);
    if (timeLimit) {
      const rejecting = timeout(timeLimit, () => {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
          listener.reject(new Abort('Timeout'));
          this.listeners.splice(index, 1);
        }
      });
      listener.promise.then(() => {
        rejecting?.cancel();
      });
    }
    return listener.promise;
  }

  event = (predicate, timeLimit) => {
    const match = this.prepareMatch(predicate);
    const result = this.oldEvent(match);
    if (result) {
      return Promise.resolve(result);
    } else {
      return this.newEvent(match, timeLimit);
    }
  }

  onEvent(evt) {
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
    this.eventLog.push(evt);
  }

  prepareMatch(predicate) {
    if (typeof(predicate) === 'function') {
      return predicate;
    }
    if (predicate === undefined) {
      return () => true;
    }
    if (!(predicate instanceof Object)) {
      throw new TypeError('Invalid argument');
    }
    return (evt) => {
      for (const [ name, value ] of Object.entries(predicate)) {
        if (evt[name] !== value) {
          return false;
        }
      }
      return true;
    };
  }
}
