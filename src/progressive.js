import { createElement } from 'react';
import { sequential, useFunction } from './sequential.js';
import { generateProps } from './prop-generator.js';
import { isPromise } from './utils.js';

export function useProgressive(cb, deps) {
  return useFunction(progressive, cb, deps);
}

export function progressive(cb, options = {}) {
  return sequential(async function* (methods) {
    let elementType;
    methods.type = (type) => {
      if (elementFn) {
        throw new Error('type() cannot be used together with element()');
      }
      if (typeof(type) === 'object' && 'default' in type) {
        elementType = type.default;
      } else if (typeof(type) === 'object' && type.constructor == null) {
        // module object has no constructor
        if (process.env.NODE_ENV === 'development') {
          console.warn('You seem to have passed a module without a default export');
        }
        elementType = type;
      } else {
        if (process.env.NODE_ENV === 'development') {
          if (isPromise(type)) {
            console.warn('You passed a promise, probably having forgotten to use await on import()');
          }
        }
        elementType = type;
      }
    };

    let elementFn;
    methods.element = (fn) => {
      if (elementType) {
        throw new Error('element() cannot be used together with type()');
      }
      elementFn = fn;
    };

    let usableDefault;
    let usability = {};
    methods.usable = (arg) => {
      if (arg instanceof Object) {
        for (const [ name, value ] of Object.entries(arg)) {
          if (typeof(value) === 'number' || typeof(value) === 'function') {
            usability[name] = value;
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
    checkAsyncProps(asyncProps, usability, usableDefault);
    if (!elementType && !elementFn) {
      throw new Error('Callback function did not call type() to set the element type');
    }
    if (!elementFn) {
      elementFn = (props) => createElement(elementType, props);
    }
    for await (const props of generateProps(asyncProps, usability)) {
      yield elementFn(props);
    }
  }, options);
}

export function checkAsyncProps(asyncProps, usability, usableDefault) {
  if (!(asyncProps instanceof Object)) {
    throw new Error('Callback function did not return an object');
  }
  if (process.env.NODE_ENV === 'development') {
    for (const name of Object.keys(usability)) {
      if (!(name in asyncProps)) {
        console.warn(`The prop "${name}" is given a usability criteria but is absent from the object returned`);
      }
    }
  }
  if (usableDefault !== undefined) {
    for (const name of Object.keys(asyncProps)) {
      if (!(name in usability)) {
        usability[name] = usableDefault;
      }
    }
  }
}
