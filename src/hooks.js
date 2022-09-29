import React, { useState, useMemo, useEffect } from 'react';

export function useHandlers(warning = false) {
  const [ pairs ] = useState(() => {
    const cxt = {
      handlers: {},
      callbacks: {},
      promises: {},
      resolves: {},
      warning,
    };
    return [
      new Proxy(cxt, { get: getHandler, set: setCallback }),
      new Proxy(cxt, { get: getPromise, set: setPromise }),
    ];
  });
  return pairs;
}

function getHandler(cxt, name) {
  let handler = cxt.handlers[name];
  if (!handler) {
    cxt.handlers[name] = handler = (evt) => callHandler(cxt, name, evt);
  }
  return handler;
}

function setCallback(cxt, name, cb) {
  cxt.callbacks[name] = cb;
  return true;
}

async function callHandler(cxt, name, evt) {
  try {
    let triggered = false;
    const cb = cxt.callbacks[name];
    if(cb) {
      await cb(evt);
      triggered = true;
    }
    const resolve = cxt.resolves[name];
    if (resolve) {
      resolve(evt);
      triggered = true;
      delete cxt.promises[name];
      delete cxt.resolves[name];
    }
    if (!triggered) {
      if (callHandler.warning) {
        console.warn(`No action was triggered by handler "${name}"`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function getPromise(cxt, name) {
  let promise = cxt.promises[name];
  if (!promise) {
    let resolve;
    cxt.promises[name] = promise = new Promise(r => resolve = r);
    cxt.resolves[name] = resolve;
  }
  return promise;
}

function setPromise(cxt, name, value) {
  throw new Error('Promise is read-only');
}

export function useSequence(delay = 0, deps) {
  const [ cxt, setContext ] = useState(() => {
    const cxt = {
      status: '',
      generator: null,
      iteration: 0,
      element: null,
      mounted: false,
      resolveLazy: null,
      createElement: (cb) => createElement(cxt, cb),
      content: null,
      pending: true,
      deferring: false,
      setContent: null,
      interval: 0,
      renderDelay: delay,
      lastError: null,
      throwError: (err) => setContext({ ...cxt, lastError: err }),
    };
    cxt.createElement.context = cxt;
    return cxt;
  });
  useMemo(() => {
    // start over whenever the dependencies change
    cxt.status = 'pending';
    cxt.lastError = null;
  }, deps);
  useEffect(() => {
    cxt.mounted = true;
    return () => {
      clearInterval(cxt.interval);
      cxt.interval = 0;
      cxt.mounted = false;
      cxt.generator = null;
      cxt.content = null;
      cxt.mounted = false;
      if (cxt.status === 'running') {
        // component is being unmounted while we're looping through the generator
        // we'll need to start from the beginning again if the component is remounted again
        cxt.status = 'pending';
      }
    };
  }, []);
  return cxt.createElement;
}

function createElement(cxt, cb) {
  if (cxt.lastError) {
    throw cxt.lastError;
  }
  if (!cxt.element) {
    // this promise will resolve to the Sequence component when
    // we receive the first item from our generator
    const promise = new Promise(r => cxt.resolveLazy = r);
    // create a "lazy-load" component
    cxt.element = React.createElement(React.lazy(() => promise));
  }
  if (cxt.status === 'pending') {
    cxt.generator = cb(cxt.iteration);
    cxt.status = 'running';
    cxt.content = null;
    cxt.pending = true;
    iterateGenerator(cxt);
  }
  return cxt.element;
}

async function iterateGenerator(cxt) {
  const { generator } = cxt;
  try {
    // set up timer for deferred renderring
    clearInterval(cxt.interval);
    let delay = cxt.renderDelay;
    if (delay > 0) {
      const interval = cxt.interval = setInterval(() => {
        // sometimes the callback can still run even after a call to clearInterval()
        if (cxt.interval !== interval) {
          return;
        }
        cxt.deferring = false;
        updateContent(cxt);
        cxt.deferring = true;
      }, delay);
      cxt.deferring = true;
    } else {
      cxt.interval = 0;
      cxt.deferring = false;
    }
    // loop through the generator
    for(;;) {
      const res = await generator.next();
      if (cxt.generator !== generator) {
        // we're being interrupted by either a change of deps or unmounting of component
        throw new Interruption;
      }
      if (res.done) {
        break;
      }
      cxt.content = res.value;
      cxt.pending = true;
      updateContent(cxt);
    }
    // okay, we've reach the end of the loop--time to render any deferred content
    if (cxt.interval) {
      clearInterval(cxt.interval);
      cxt.interval = 0;
      if (cxt.deferring) {
        cxt.deferring = false;
        updateContent(cxt);
      }
    }
    cxt.iteration++;
    cxt.status = 'success';
  } catch (err) {
    if (!(err instanceof Interruption)) {
      // trigger rerendering of the component so that we can throw
      // the error where it could be caught by an error boundary
      if (cxt.generator === generator) {
        cxt.status = 'failure';
        cxt.throwError(err);
      }
    }
  } finally {
    // run the generator's finally block, catching potential exceptions
    try {
      await generator.return();
    } catch (err) {
      // trigger error boundary during development, when higher visible is preferable
      if (process.env.node_env === 'development') {
        cxt.throwError(err);
      } else {
        console.error(err);
      }
    }
    if (cxt.generator === generator) {
      // let generator be gc'ed
      cxt.generator = null;
    }
  }
}

function updateContent(cxt) {
  if (!cxt.pending || cxt.deferring) {
    // do nothing when there's no pending content or rendering is being deferred
    return;
  }
  if (cxt.resolveLazy) {
    // the Sequence component has not been "loaded" yet--resolve it now
    const initialContent = cxt.content;
    cxt.resolveLazy({ default: Sequence });
    cxt.resolveLazy = null;

    function Sequence() {
      const [ content, setContent ] = useState(initialContent);
      if (!cxt.setContent) {
        cxt.setContent = setContent;
      }
      return content;
    }
  } else {
    cxt.setContent(cxt.content);
  }
  cxt.content = null;
  cxt.pending = false;
}

class Interruption extends Error {}
