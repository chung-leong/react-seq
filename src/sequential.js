import { useMemo, useEffect, useReducer, startTransition, createElement, lazy, Suspense } from 'react';
import { IntermittentIterator, Timeout, Interruption } from './iterator.js';
import { EventManager } from './event-manager.js';
import { Abort, isAbortError } from './utils.js';

export function useSequential(cb, deps) {
  return useMemo(() => sequential(cb), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function sequential(cb) {
  const abortController = new AbortController();
  const { signal } = abortController;
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal });
  methods.defer = delay => {
    iterator.setDelay(delay);
  };

  // let callback set timeout element (or its creation function), to be used when
  // we fail to retrieve the first item from the generator after time limit has been exceeded
  let timeoutEl;
  methods.timeout = (limit, el) => {
    iterator.setLimit(limit);
    timeoutEl = el;
  };

  // allow the creation of suspending component
  let suspending = false;
  let suspensionKey;
  methods.suspend = (key = undefined) => {
    if (placeholder) {
      throw new Error('suspend() cannot be used together with fallback()');
    }
    suspending = true;
    suspensionKey = key;
  };

  // let callback manages events with help of promises
  if (!process.env.REACT_SEQ_NO_EM) {
    methods.manageEvents = (options = {}) => {
      const { on, eventual } = new EventManager({ ...options, signal });
      return [ on, eventual ];
    };
  }

  // let callback set fallback content
  let placeholder;
  let sync = true;
  methods.fallback = (el) => {
    if (!sync) {
      throw new Error('Fallback component must be set prior to any yield or await statement');
    }
    if (suspending) {
      throw new Error('fallback() cannot be used together with suspend()');
    }
    if (typeof(el) === 'function') {
      el = el();
    }
    placeholder = el;
  };

  // container for fallback content, the use of which allows to detect
  // unexpected unmounting of the fallback content (i.e. the parent
  // got unmounted)
  let fallbackUnmountExpected = false;
  function Fallback({ children }) {
    useEffect(() => {
      return () => {
        if (!fallbackUnmountExpected) {
          abortController.abort();
        }
      };
    });
    return children;
  }

  // create the first generator and pull the first result to trigger
  // the execution of the sync section of the code
  const generator = cb(methods);
  iterator.start(generator);
  iterator.fetch();
  sync = false;

  // stop iterator when abort is signaled
  signal.addEventListener('abort', () => iterator.throw(new Abort()), { once: true });

  // define lazy component Sequence
  const Lazy = createLazyComponent(suspensionKey, async () => {
    let pendingContent;
    let pendingError;
    let unusedSlot = false;

    // retrieve initial contents
    let stop = false, empty = false, aborted = false;
    do {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          pendingContent = (value !== undefined) ? value : null;
          if (iterator.delay === 0 || unusedSlot) {
            stop = true;
          }
        } else {
          stop = empty = true;
        }
      } catch (err) {
        if (err instanceof Timeout) {
          // time limit has been reached--need to resolve the promise now
          if (pendingContent === undefined) {
            // we got nothing to show--reach for the timeout element
            if (typeof(timeoutEl) === 'function') {
              timeoutEl = await timeoutEl();
            }
            pendingContent = (timeoutEl !== undefined) ? timeoutEl : null;
          }
          stop = true;
        } else if (err instanceof Interruption) {
          if (pendingContent !== undefined) {
            // got something to show--time to resolve the promise and
            // get the component to unsuspend
            stop = true;
          } else {
            unusedSlot = true;
          }
        } else if (err instanceof Abort) {
          stop = aborted = true;
        } else if (isAbortError(err)) {
          // quietly ignore error
          stop = aborted = true;
        } else {
          // resolve the promise and throw the error from inside the component
          pendingError = err;
          stop = true;
        }
      }
    } while (!stop);

    let currentContent = pendingContent;
    let currentError;
    let redrawComponent;

    // retrieve the remaining items from the generator unless an error was encountered
    // or it's empty already
    if (!empty && !pendingError && !aborted) {
      retrieveRemaining();
    } else {
      // don't wait for return()
      iterator.return().catch(err => console.error(err));
    }
    fallbackUnmountExpected = true;
    return { default: Sequence };

    function Sequence() {
      // trigger rerendering using useReducer()
      redrawComponent = useReducer(c => c + 1, 0)[1];
      if (currentError) {
        throw currentError;
      }
      useEffect(() => {
        if (pendingError) {
          // throw error encountered while obtaining initial content
          currentError = pendingError;
          pendingError = undefined;
          redrawComponent();
        }
        return () => {
          // abort iteration through generator on unmount
          abortController.abort();
        };
      }, []);
      return currentContent;
    }

    function updateContent(urgent, conditional = false) {
      if (conditional) {
        if (iterator.delay > 0 && !unusedSlot) {
          // wait for next interruption
          return;
        }
      }
      if (pendingContent !== undefined) {
        currentContent = pendingContent;
        pendingContent = undefined;
        if (redrawComponent) {
          if (urgent) {
            redrawComponent();
          } else {
            startTransition(() => {
              redrawComponent();
            });
          }
        }
        unusedSlot = false;
      } else {
        unusedSlot = true;
      }
    }

    function throwError(err) {
      currentError = err;
      if (redrawComponent) {
        redrawComponent();
      }
    }

    async function retrieveRemaining() {
      let stop = false;
      pendingContent = undefined;
      do {
        try {
          const { value, done } = await iterator.next();
          if (!done) {
            pendingContent = (value !== undefined) ? value : null;
            updateContent(false, true);
          } else {
            stop = true;
          }
        } catch (err) {
          if (err instanceof Interruption) {
            updateContent(false);
          } else if (err instanceof Abort) {
            stop = true;
          } else if (isAbortError(err)) {
            // quietly ignore error
            stop = true;
          } else {
            throwError(err);
            stop = true;
          }
        }
      } while (!stop);
      updateContent(true);
      await iterator.return().catch(err => console.error(err));
    }
  });

  // create the component
  const lazyEl = createElement(Lazy);
  if (suspending) {
    return lazyEl;
  } else {
    // wrap it in a Suspense
    const fallbackEl = createElement(Fallback, {}, placeholder);
    return createElement(Suspense, { fallback: fallbackEl }, lazyEl);
  }
}

const lazyComponents = {};

function createLazyComponent(key, fn) {
  if (typeof(key) === 'string') {
    let c = lazyComponents[key];
    if (c) {
      delete lazyComponents[key];
    } else {
      c = lazyComponents[key] = lazy(fn);
    }
    return c;
  } else {
    return lazy(fn);
  }
}
