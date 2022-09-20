import React, { useState, useMemo, useEffect } from 'react';

export function useSequence(options = {}, deps) {
  const [ cxt, setContext ] = useState(() => {
    const cxt = {
      state: '',
      generator: null,
      iteration: 0,
      element: null,
      mounted: false,
      resolveLazy: null,
      createElement: (cb) => createElement(cxt, cb),
      content: null,
      setContent: null,
      timeout: 0,
      renderDelay: 50,
      rerenderDelay: 500,
      serverSide: true,
      lastError: null,
      throwError: (err) => setContext({ ...cxt, lastError: err }),
    };
    return cxt;
  });
  useMemo(() => {
    // start over whenever the dependencies change
    cxt.state = 'pending';
    cxt.lastError = null;
  }, deps);
  useEffect(() => {
    cxt.mounted = true;
    return () => {
      clearTimeout(cxt.timeout);
      cxt.timeout = 0;
      cxt.mounted = false;
      cxt.generator = null;
      cxt.content = null;
      cxt.mounted = false;
      if (cxt.state === 'running') {
        // component is being unmounted while we're looping through the generator
        // we'll need to start from the beginning again if the component is remounted again
        cxt.state = 'pending';
      }
    };
  }, []);
  return ref.createElement;
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
    iterateGenerator(cxt);
  }
  return cxt.element;
}

async function iterateGenerator(cxt) {
  const { generator } = cxt;
  try {
    // set up timer for deferred renderring
    const delay = (cxt.iteration > 0) ? cxt.rerenderDelay : cxt.renderDelay;
    clearTimeout(cxt.timeout);
    if (delay > 0) {
      const timeout = cxt.timeout = setTimeout(() => {
        // sometimes the callback can still run even after a call to clearTimeout()
        if (cxt.timeout !== timeout) {
          return;
        }
        cxt.timeout = 0;
        updateContent(cxt);
      }, delay);
    } else {
      cxt.timeout = 0;
    }
    // loop through the generator
    let done = false;
    while (!done) {
      const res = await generator.next();
      if (cxt.generator !== generator) {
        // we're being interrupted by either a change of deps or unmounting of component
        throw new Interruption;
      }
      done = res.done;
      cxt.content = res.value;
      updateContent(cxt);
    }
    // okay, we've reach the end of the loop--time to render any deferred content
    if (cxt.timeout) {
      clearTimeout(cxt.timeout);
      cxt.timeout = 0;
      updateContent(cxt);
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
      // let generator get gc'ed
      cxt.generator = null;
    }
  }
}

function updateContent(cxt) {
  if (cxt.timeout) {
    // rendering is being deferred
    return;
  }
  if (cxt.resolveLazy) {
    // the Sequence component has not been "loaded" yet
    // resolve it now
    cxt.resolveLazy(Sequence);
    cxt.resolveLazy = null;

    function Sequence() {
      const [ content, setContent ] = useState(cxt.content);
      if (!cxt.setContent) {
        cxt.setContent = setContent;
      }
      return content;
    }
  } else {
    cxt.setContent(cxt.content);
  }
  cxt.content = null;
}

class Interruption extends Error {}
