import React, { useState, useMemo, useEffect, startTransition } from 'react';

export function useSequence(options = {}, deps) {
  const {
    delay = 0,
    suspend = false,
  } = options;
  const [ cxt, setContext ] = useState(() => {
    return {
      // the number of ms to wait until new content is handed to React for rendering
      delay,
      // whether we should leave our lazy component not wrapped by <Suspense></Suspense>
      suspend,
      // current status can be 'unresolved', 'running', 'success', or 'failure'
      status: '',
      // generator return by callback function passed to createElement()
      generator: null,
      // the number of times generators were successfully iterated through
      iteration: 0,
      // the actual React element which holds the current content
      element: null,
      // placeholder element to be shown prior to receiving the first item from the generator
      placeholder: null,
      // function for setting fallback content; passed to callback given to createElement()
      fallback: (el) => setPlaceholder(cxt, el),
      // whether the callback is in its initial synchronous portion (i.e. prior to any await operation)
      sync: true,
      // function that is returned by the hook
      createElement: (cb) => createElement(cxt, cb),
      // function that resolves the lazy component
      resolveLazy: null,
      // pending content
      content: null,
      // whether there's any content pending
      pending: true,
      // whether rerendering should be deferred
      deferring: false,
      // function for handing new content to React; we get it after the first content is rendered
      setContent: null,
      // interval used to trigger rendering of deferred content
      interval: 0,
      // the last error encountered while iterating through generator
      error: null,
      // whether we're in the midst of throwing an error
      throwing: false,
      // function for setting the last error; it triggers a redraw so the error can be thrown
      // in the middle of rerendering, permitting the capture of the error by error boundary
      throwError: (err) => setContext({ ...cxt, error: err, throwing: true }),
      // whether the component is mounted
      mounted: false,
    };
  });
  useMemo(() => {
    // start over whenever the dependencies change (unless we're reporting a new error)
    if (!cxt.throwing) {
      cxt.status = 'unresolved';
      cxt.error = null;
    }
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
  if (cxt.error) {
    cxt.throwing = false;
    throw cxt.error;
  }
  if (cxt.status === 'unresolved') {
    // create async generator and start iterating through it
    const { iteration, fallback } = cxt;
    cxt.sync = true;
    cxt.generator = cb({ iteration, fallback });
    iterateGenerator(cxt);
    cxt.sync = false;
  }
  if (!cxt.element) {
    const { placeholder: fallback, suspend } = cxt;
    // this promise will resolve to the Sequence (or React.lazy) component when
    // we receive the first item from our generator
    const promise = new Promise(r => cxt.resolveLazy = r);
    // create a "lazy-load" component
    const lazyElement = React.createElement(React.lazy(() => promise));
    if (suspend) {
      cxt.element = lazyElement;
    } else {
      cxt.element = React.createElement(React.Suspense, { fallback }, lazyElement);
    }
  }
  return cxt.element;
}

async function iterateGenerator(cxt) {
  const { generator } = cxt;
  try {
    // set up timer for deferred rendering
    cxt.status = 'running';
    cxt.content = null;
    cxt.pending = false;
    cxt.element = null;
    clearInterval(cxt.interval);
    const delay = cxt.delay * delayMultiplier;
    if (delay > 0) {
      const interval = cxt.interval = setInterval(() => {
        // sometimes the callback can still run even after a call to clearInterval()
        if (cxt.interval !== interval) {
          return;
        }
        if (cxt.pending) {
          // render pending content
          updateContent(cxt, cxt.content, false);
          cxt.content = null;
          cxt.pending = false;
        }
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
      if (cxt.deferring) {
        cxt.content = res.value;
        cxt.pending = true;
      } else {
        updateContent(cxt, res.value, true);
      }
    }
    // okay, we've reach the end of the loop--time to render any deferred content
    if (cxt.interval) {
      clearInterval(cxt.interval);
      cxt.interval = 0;
      if (cxt.pending) {
        updateContent(cxt, cxt.content, true);
        cxt.content = null;
        cxt.pending = false;
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
  if (!cxt.sync) {
    throw new Error('Fallback component must be set prior to any yield or await statement');
  }
  if (cxt.suspend) {
    throw new Error('A component that suspends cannot have a fallback component');
  }
  if (typeof(el) === 'function') {
    el = el();
  }
  cxt.placeholder = el;
}

function updateContent(cxt, content, urgent) {
  if (cxt.resolveLazy) {
    // the Sequence component has not been "loaded" yet--resolve it now
    const initialContent = content;
    cxt.resolveLazy({ default: Sequence });
    cxt.resolveLazy = null;

    function Sequence() {
      const [ content, setContent ] = useState(initialContent);
      cxt.setContent = setContent;
      return content;
    }
  } else {
    if (urgent) {
      cxt.setContent(content);
    } else {
      // wrap call in startTransition() when update is not urgent
      startTransition(() => cxt.setContent(content));
    }
  }
}

class Interruption extends Error {}
