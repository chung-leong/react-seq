export async function* generateProps(asyncProps, usables) {
  const propSet = [];
  try {
    // see which props need to be handled asynchronously
    for (const [ name, value ] of Object.entries(asyncProps)) {
      const usable = usables[name];
      if (isPromise(value)) {
        propSet.push({
          name,
          usable,
          type: 'promise',
          source: value,
          promise: null,
          value: undefined,
          changed: true,
          resolved: false,
        });
      } else if (isGenerator(value)) {
        propSet.push({
          name,
          usable,
          type: 'generator',
          source: value,
          promise: null,
          value: [],
          changed: true,
          resolved: false,
        });
      } else {
        propSet.push({
          name,
          usable,
          value,
          type: 'sync',
          resolved: true,
          changed: true,
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
            if (p.type === 'promise') {
              p.promise = p.source.then((value) => {
                // see if the promise returned a generator
                if (isGenerator(value)) {
                  p.type = 'generator';
                  p.source = value;
                  p.value = [];
                } else {
                  p.value = value;
                  p.resolved = true;
                }
                p.changed = true;
                p.promise = null;
              })
            } else if (p.type === 'generator') {
              let res = p.source.next();
              if (isPromise(res)) {
                p.promise = res.then(({ value, done }) => {
                  if (!done) {
                    p.value.push(value);
                    p.changed = true;
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
              throw new Error(`Props "${p.name}" is unusable even after having been fully resolved`);
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

function isPromise(obj) {
  if (obj instanceof Object) {
    if (typeof(obj.then) === 'function' && typeof(obj.catch) === 'function') {
      return true;
    }
  }
  return false;
}

function isGenerator(obj) {
  if (obj instanceof Object) {
    if (typeof(obj.next) === 'function' && typeof(obj.return) === 'function' && typeof(obj.throw) === 'function') {
      return true;
    }
  }
  return false;
}
