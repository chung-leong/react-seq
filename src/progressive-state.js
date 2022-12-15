import { sequentialState, useFunctionState } from './sequential-state.js';
import { checkAsyncProps } from './progressive.js';
import { generateProps } from './prop-generator.js';

export function useProgressiveState(cb, deps) {
  return useFunctionState(progressiveState, cb, deps);
}

export function progressiveState(cb, setState, setError, options) {
  return sequentialState(async function* (methods) {
    let usableDefault = false;
    let usables = {};
    methods.usable = (arg) => {
      if (arg instanceof Object) {
        for (const [ name, value ] of Object.entries(arg)) {
          if (typeof(value) === 'number' || typeof(value) === 'function') {
            usables[name] = value;
          } else {
            throw new Error('usable() expects object properties to be numbers or functions');
          }
        }
      } else if (typeof(arg) === 'number' || typeof(arg) === 'function') {
        usableDefault = arg;
      } else {
        throw new Error('usable() expects a number, a function, or an object');
      }
    };

    const asyncProps = await cb(methods);
    checkAsyncProps(asyncProps, usables, usableDefault);
    yield generateProps(asyncProps, usables);
  }, setState, setError, options);
}
