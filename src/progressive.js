export async function* generateProps(asyncProps, usables) {
  const propSet = [];
  try {
    // see which props need to be handled asynchronously
    for (const [ name, value ] of Object.entries(asyncProps)) {
      const usable = usables[name];
      if (isAsync(value)) {
        // create a generator that yield the value of this prop as time progresses
        // (i.e. an array becomes bigger as values are retrieved from generator)
        const initial = isGenerator(value) ? [] : undefined;
        propSet.push({
          name,
          usable,
          value: initial,
          generator: generateNext(value, initial),
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
        if (p.usable !== undefined) {
          let usable = (typeof(p.usable) === 'function') ? p.usable(p.value, props) : !!p.usable;
          if (!usable) {
            if (p.resolved) {
              console.warn(`Prop "${p.name}" is unusable even after having been fully resolved`);
            }
            setUsable = false;
            break;
          }
        } else if (!p.resolved) {
          setUsable = false;
          break;
        }
        if (p.changed) {
          setChanged = true;
        }
      }
      if (setUsable && setChanged) {
        for (const p of propSet) {
          p.changed = false;
        }
        yield props;
      }
    } while (!stop);
  } finally {
    // run finally section of generators
    for(const p of propSet) {
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
  }
}

export async function* generateNext(source, current, sent = false) {
  function add(next) {
    if (current) {
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
        const ret = source.return();
        if (isPromise(ret)) {
          ret.catch(err => console.error(err));
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
  return (obj instanceof Object && typeof(obj.next) === 'function' && typeof(obj.return) === 'function');
}