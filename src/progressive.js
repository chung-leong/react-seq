import { useMemo, createElement } from 'react';
import { sequential } from './sequential.js';
import { isPromise, isGenerator, isAsync } from './utils.js';

export function useProgressive(cb, deps) {
  return useMemo(() => progressive(cb), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function progressive(cb) {
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

    let usableDefault = false;
    let usables = {};
    methods.usable = (arg) => {
      if (arg instanceof Object) {
        Object.assign(usables, arg);
      } else if (typeof(arg) === 'number' || typeof(arg) === 'function') {
        usableDefault = arg;
      } else {
        throw new Error('usable() expects a number, a function, or an object');
      }
    };

    const asyncProps = await cb(methods);
    checkAsyncProps(asyncProps, usables, usableDefault);
    if (!elementType && !elementFn) {
      throw new Error('Callback function did not call type() to set the element type');
    }
    if (!elementFn) {
      elementFn = (props) => createElement(elementType, props);
    }
    for await (const props of generateProps(asyncProps, usables)) {
      yield elementFn(props);
    }
  });
}

export function checkAsyncProps(asyncProps, usables, usableDefault) {
  if (!(asyncProps instanceof Object)) {
    throw new Error('Callback function did not return an object');
  }
  if (process.env.NODE_ENV === 'development') {
    for (const name of Object.keys(usables)) {
      if (!(name in asyncProps)) {
        console.warn(`The prop "${name}" is given a usability criteria but is absent from the object returned`);
      }
    }
  }
  if (usableDefault !== false) {
    for (const name of Object.keys(asyncProps)) {
      if (!(name in usables)) {
        usables[name] = usableDefault;
      }
    }
  }
}

export async function* generateProps(asyncProps, usables) {
  const propSet = [];
  try {
    // see which props need to be handled asynchronously
    for (const [ name, value ] of Object.entries(asyncProps)) {
      const usable = usables[name];
      if (isAsync(value)) {
        // create a generator that yield the value of this prop as time progresses
        // (i.e. an array becomes bigger as values are retrieved from generator)
        propSet.push({
          name,
          usable,
          value: undefined,
          generator: generateNext(value),
          promise: null,
          changed: true,
          resolved: false,
        });
      } else {
        propSet.push({
          name,
          usable,
          value,
          changed: true,
          resolved: true,
        });
      }
    }
    let stop = false;
    for (;;) {
      // see if we can yield a usable propset--this can happen at the very beginning
      // before anything is retrieved when all props have usability of 0
      const props = {};
      for (const p of propSet) {
        props[p.name] = p.value;
      }
      let setUsable = true;
      let setChanged = false;
      for (const p of propSet) {
        if (!p.resolved) {
          // see if the prop is usable despite not having been fully resolved
          let propUsable = false;
          if (p.usable !== undefined) {
            if (typeof(p.usable) === 'function') {
              propUsable = !!p.usable(p.value, props);
            } else if (typeof(p.usable) === 'number') {
              let length = 0;
              if (p.value instanceof Array) {
                length = p.value.length;
              } else {
                length = (p.value != null) ? 1 : 0;
              }
              propUsable = length >= p.usable;
            } else {
              propUsable = !!p.usable;
            }
          }
          if (!propUsable) {
            setUsable = false;
            break;
          }
        }
        if (p.changed) {
          setChanged = true;
        }
      }
      // yield the prop set when it's usable or when we can't generate a new one
      // unless the set has not been changed since it was last sent
      if ((setUsable || stop) && setChanged) {
        for (const p of propSet) {
          p.changed = false;
        }
        yield props;
      }
      if (stop) {
        break;
      }

      // obtain a list of promises for props that aren't fully resolved
      // using forEach() since we need to bind p to callbacks
      const promises = [];
      propSet.forEach(p => {
        if (!p.resolved) {
          if (!p.promise) {
            p.promise = p.generator.next().then(({ value, done }) => {
              if (!done) {
                p.value = value;
                p.changed = true;
                p.promise = null;
              } else {
                p.resolved = true;
                p.generator = null;
              }
            });
          }
          promises.push(p.promise);
        }
      });
      if (promises.length > 0) {
        // wait until one of them resolves
        await ((promises.length === 1) ? promises[0] : Promise.race(promises));
      } else {
        stop = true;
      }
    }
  } finally {
    // run finally section of generators
    for(const p of propSet) {
      if (p.generator) {
        try {
          await p.generator.return();
        } catch (err) {
          // normally, return() is a no-op since the finally section has already been run
          // return() runs the finally run section only when the generator is prematurely
          // closed; any error would simply be silently ignored; we throw it therefore
          // in to the console so the programmer at least know an error is happening
          console.error(err);
        }
      }
    }
  }
}

export async function* generateNext(source, current = undefined, sent = false) {
  function add(next) {
    if (current instanceof Array) {
      if (sent) {
        // create a new array as the current one has been sent
        // to the caller already and we don't want to change it
        current = [ ...current ];
        sent = false;
      }
      current.push(next);
    } else {
      current = next;
    }
  }

  function result() {
    // remember that we've sent the result to the caller
    sent = true;
    return current;
  }

  if (isGenerator(source)) {
    // loop through the values returned by the generator
    let stop = false;
    if (current === undefined) {
      current = [];
    }
    try {
      do {
        const ret = source.next();
        // using await if we have an async generator
        const { value: next, done } = isPromise(ret) ? await ret : ret;
        if (!done) {
          if (isAsync(next)) {
            // a promise or a generator, handle it recursively, with
            // values appended to the array
            for await (current of generateNext(next, current, sent)) {
              yield result();
            }
          } else {
            // add the value to the array, sending it to the caller
            // if this is an async generator
            add(next);
            if (isPromise(ret)) {
              yield result();
            }
          }
        } else {
          stop = true;
        }
      } while (!stop);
      // if this is a sync generator, send the updated array now
      if (!sent) {
        yield result();
      }
    } finally {
      // run finally section
      if (source.return) {
        await source.return();
      }
    }
  } else if (isPromise(source)) {
    const next = await source;
    if (isAsync(next)) {
      // we've probably just resolved a promise of a generator
      for await (current of generateNext(next, current, sent)) {
        yield result();
      }
    } else {
      add(next);
      yield result();
    }
  }
}
