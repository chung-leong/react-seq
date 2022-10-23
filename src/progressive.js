import { useMemo, createElement } from 'react';
import { sequential } from './sequential.js';

export function useProgressive(cb, deps) {
  return useMemo(() => progressive(cb), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function progressive(cb) {
  return sequential(async function* (methods) {
    let elementType;
    function type(type) {
      if (elementFn) {
        throw new Error('type() cannot be used together with element()');
      }
      if (type instanceof Object && 'default' in type) {
        elementType = type.default;
      } else {
        elementType = type;
      }
    }

    let elementFn;
    function element(fn) {
      if (elementType) {
        throw new Error('element() cannot be used together with type()');
      }
      elementFn = fn;
    }

    let usables;
    function usable(obj) {
      if (!(obj instanceof Object)) {
        throw new Error('usable() expects an object');
      }
      usables = obj;
    }

    const asyncProps = await cb({ ...methods, type, element, usable });
    checkAsyncProps(asyncProps, usables);
    if (!elementType && !elementFn) {
      throw new Error('Callback function did not call type() to set the element type');
    }
    if (!usables) {
      usables = findUsableProps(elementFn || elementType);
    }
    if (!elementFn) {
      elementFn = (props) => createElement(elementType, props);
    }
    for await (const props of generateProps(asyncProps, usables)) {
      yield elementFn(props);
    }
  });
}

export function checkAsyncProps(asyncProps, usables) {
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
}

export function findUsableProps(fn) {
  const props = {};
  if (fn instanceof Function) {
    // look for parameters
    const s = fn.toString();
    let p = s.substring(s.indexOf('(') + 1, s.indexOf(')'));
    // remove comments
    p = p.replace(/\/\*[\s\S]*?\*\//g, '');
    p = p.replace(/\/\/(.)*/g, '');
    // remove whitespaces
    p = p.replace(/\s+/g, '');
    let d;
    if (p.charAt(0) === '{' && p.charAt(p.length - 1) === '}') {
      // destructuring props
      d = p.substr(1, p.length - 2);
    } else if (/^\w+$/.test(p)) {
      // maybe the argument destructuring got transpiled into code in the function body
      // get the first line of code see if it matches known pattern
      let l = s.substring(s.indexOf('{') + 1, s.indexOf(';'));
      // remove whitespaces
      l = l.replace(/\s+/g, '');
      if (l.startsWith('let{') && l.endsWith('}=' + p)) {
        d = l.substr(4, l.length - 4 - 2 - p.length);
      }
    }
    if (d) {
      for (const param of d.split(',')) {
        const eq = param.indexOf('=');
        if (eq !== -1) {
          const name = param.substr(0, eq);
          props[name] = true;
        }
      }
    }
  }
  return props;
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
          value: isGenerator(value) ? [] : undefined,
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
    do {
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
      // check if all props are usable
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
              propUsable = !!p.usable(p.value, p.resolved, props);
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
    } while (!stop);
  } finally {
    // run finally section of generators
    for(const p of propSet) {
      if (p.generator) {
        try {
          await p.generator.return();
        } catch (err) {
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
    } else if (isGenerator(source)) {
      current = [ next ];
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
      try {
        if (source.return) {
          const ret = source.return();
          if (isPromise(ret)) {
            ret.catch((err) => console.error(err));
          }
        }
      } catch (err) {
        console.error(err);
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

function isAsync(obj) {
  return isPromise(obj) || isGenerator(obj);
}

function isPromise(obj) {
  return (obj instanceof Object && typeof(obj.then) === 'function');
}

function isGenerator(obj) {
  return (obj instanceof Object && typeof(obj.next) === 'function');
}
