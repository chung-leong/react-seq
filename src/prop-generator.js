import { isPromise, isAsyncGenerator, isSyncGenerator } from './utils.js';

// NOTE: don't use default argument--it'll trigger transpiling bug
export async function* generateProps(asyncProps, usability) {
  const propSet = [];
  try {
    // see which props need to be handled asynchronously
    for (const [ name, value ] of Object.entries(asyncProps)) {
      const usable = usability[name] ?? 0;
      if (isComplex(value)) {
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
          // normally, return() is a no-op since the finally section has already been run;
          // return() runs the finally section only when the generator is prematurely
          // closed; any error would simply be silently ignored; we throw it therefore
          // into the console so the programmer at least know an error is happening
          console.error(err);
        }
      }
    }
  }
}

function isAsync(value) {
  return isPromise(value) || isAsyncGenerator(value);
}

function isComplex(value) {
  return isPromise(value) || isAsyncGenerator(value) || isSyncGenerator(value);
}

export async function* generateNext(source) {
  const base = source;
  const stack = [];
  let exhausted = false;
  let current = false;
  let pending = false;
  let appending = false;
  let count = 0;
  try {
    for (;;) {
      if (exhausted) {
        // no more data from the current source, see if there's anything on the stack
        if (stack.length > 0) {
          source = stack.pop();
          exhausted = false;
        } else {
          source = null;
          if (pending) {
            yield current;
          }
          // we're done
          break;
        }
      }
      if (isAsync(source)) {
        // the next addition will take time, yield pending value if any
        if (pending) {
          yield current;
          pending = false;
        }
      }
      let value, retrieved = false;
      if (isSyncGenerator(source)) {
        const res = source.next();
        if (res.done) {
          exhausted = true;
          if (typeof(source.return) === 'function') {
            source.return();
          }
        } else {
          value = res.value;
          retrieved = true;
        }
        appending = true;
      } if (isAsyncGenerator(source)) {
        const res = await source.next();
        if (res.done) {
          exhausted = true;
          if (typeof(source.return) === 'function') {
            await source.return();
          }
        } else {
          value = res.value;
          retrieved = true;
        }
        appending = true;
      } else if (isPromise(source)) {
        value = await source;
        exhausted = true;
        retrieved = true;
      }
      if (retrieved) {
        // got something
        if (isComplex(value)) {
          if (!exhausted) {
            // push the current source onto the stack
            stack.push(source);
          }
          source = value;
          exhausted = false;
        } else {
          if (count === 0) {
            if (appending) {
              current = [ value ];
            } else {
              current = value;
            }
          } else {
            // create a duplicate if the current one was yielded previously
            if (!pending) {
              current = [ ...current ];
            }
            current.push(value);
          }
          if (appending) {
            for (const key of Object.keys(base)) {
              if (!(key in current)) {
                const descriptor = Object.getOwnPropertyDescriptor(base, key);
                Object.defineProperty(current, key, descriptor);
              }
            }
          }
          pending = true;
          count++;
        }
      }
    }
  } catch (err) {
    if (pending) {
      yield current;
    }
    throw err;
  } finally {
    while (source) {
      // shutdown source prematurelly
      if (isSyncGenerator(source)) {
        if (typeof(source.return) === 'function') {
          source.return();
        }
      } else if (isAsyncGenerator(source)) {
        if (typeof(source.return) === 'function') {
          await source.return();
        }
      }
      source = stack.pop();
    }
  }
}
