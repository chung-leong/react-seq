import React, { useState, useMemo, useEffect } from 'react';

export function useSequence(delay = 0, deps) {
  const [ cxt, setContext ] = useState(() => {
    let cxt = {
      status: '',
      generator: null,
      iteration: 0,
      element: null,
      placeholder: null,
      mounted: false,
      resolveLazy: null,
      createElement: (cb) => createElement(cxt, cb),
      fallback: (el) => setPlaceholder(cxt, el),
      fallbackAllowed: true,
      content: null,
      pending: true,
      deferring: false,
      setContent: null,
      suspend: false,
      interval: 0,
      delay: delay,
      lastError: null,
      lastErrorThrown: false,
      // ensure the closures above are pointing to the new cxt
      throwError: (err) => setContext(cxt = { ...cxt, lastError: err, lastErrorThrown: false }),
    };
    cxt.createElement.context = cxt;
    return cxt;
  });
  useMemo(() => {
    // start over whenever the dependencies change (unless we're reporting an error)
    if (!cxt.lastError || cxt.lastErrorThrown) {
      cxt.status = 'unresolved';
      cxt.lastError = null;
    }
  }, deps || []);
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
        // we'll need to start from the beginning if the component is remounted again
        cxt.status = 'unresolved';
        cxt.element = null;
      }
    };
  }, []);
  return cxt.createElement;
}

let delayMultiplier = 1;

export function extendDelay(multiplier) {
  delayMultiplier = multiplier;
}

function createElement(cxt, cb) {
  if (cxt.lastError) {
    cxt.lastErrorThrown = true;
    throw cxt.lastError;
  }
  if (cxt.status === 'unresolved') {
    // start running the async generator
    const { iteration, fallback } = cxt;
    cxt.generator = cb({ iteration, fallback });
    iterateGenerator(cxt);
    cxt.fallbackAllowed = false;
  }
  if (!cxt.element) {
    // this promise will resolve to the Sequence component when
    // we receive the first item from our generator
    const promise = new Promise(r => cxt.resolveLazy = r);
    // create a "lazy-load" component
    const lazyElement = React.createElement(React.lazy(() => promise));
    if (cxt.suspend) {
      cxt.element = lazyElement;
    } else {
      cxt.element = React.createElement(React.Suspense, { fallback: cxt.placeholder }, lazyElement);
    }
    // placeholder can no longer to change at this point
    cxt.fallback = () => {};
  }
  return cxt.element;
}

async function iterateGenerator(cxt) {
  const { generator } = cxt;
  try {
    // set up timer for deferred rendering
    cxt.status = 'running';
    clearInterval(cxt.interval);
    const delay = cxt.delay * delayMultiplier;
    if (delay > 0) {
      const interval = cxt.interval = setInterval(() => {
        // sometimes the callback can still run even after a call to clearInterval()
        if (cxt.interval !== interval) {
          return;
        }
        // update when delay is reached
        cxt.deferring = false;
        updateContent(cxt);
        cxt.deferring = true;
      }, delay);
      cxt.content = cxt.placeholder;
      cxt.pending = true;
      cxt.deferring = true;
    } else {
      // don't show placeholder again when no delay is used
      cxt.content = null;
      cxt.pending = false;
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

function setPlaceholder(cxt, el) {
  if (!cxt.fallbackAllowed) {
    throw new Error('Fallback component must be set prior to any yield or await statement');
  }
  if (typeof(el) === 'function') {
    el = el();
  }
  cxt.placeholder = el;
}

function updateContent(cxt) {
  if (!cxt.pending || cxt.deferring) {
    // do nothing when there's no pending content or rendering is being deferred
    return;
  }
  if (!cxt.resolveLazy && !cxt.setContent) {
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
