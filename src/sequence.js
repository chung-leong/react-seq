import { useMemo, useEffect, useReducer, startTransition, createElement, lazy, Suspense } from 'react';
import { IntermittentIterator, Interruption, Abort } from './iterator.js';
import { createEventManager } from './events.js';

export function useSequence(cb, deps) {
  return useMemo(() => sequence(cb), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function sequence(cb) {
  const abortController = new AbortController();
  const { signal } = abortController;

  // let callback set content update delay
  const iterator = new IntermittentIterator();
  function defer(ms) {
    iterator.setDelay(ms);
  }

  // normally we wait for the first item from the generator before
  // resolving the lazy component; let callback override this
  let emptyAllowed = false;
  function allowEmpty() {
    emptyAllowed = true;
  }

  // allow the creation of suspending component
  let suspensionKey;
  function suspend(key) {
    if (typeof(key) !== 'string') {
      throw new Error('suspend() expects a unique string id as parameter');
    }
    if (placeholder) {
      throw new Error('suspend() cannot be used together with fallback()');
    }
    suspensionKey = key;
  }

  // let callback manages events with help of promises
  function manageEvents(options) {
    const { on, eventual, reject } = createEventManager(options);
    signal.addEventListener('abort', () => reject(new Abort), { signal });
    return [ on, eventual ];
  }

  // let callback set fallback content
  let placeholder;
  let sync = true;
  function fallback(el) {
    if (!sync) {
      throw new Error('Fallback component must be set prior to any yield or await statement');
    }
    if (suspensionKey) {
      throw new Error('fallback() cannot be used together with suspend()');
    }
    if (typeof(el) === 'function') {
      el = el();
    }
    placeholder = el;
  }

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
  const generator = cb({ defer, allowEmpty, manageEvents, fallback, suspend, signal });
  iterator.start(generator);
  iterator.fetch();
  sync = false;

  // stop iterator when abort is signaled
  signal.addEventListener('abort', () => iterator.throw(new Abort()), { signal });

  // define lazy component Sequence
  const Lazy = createLazyComponent(suspensionKey, async () => {
    let pendingContent;
    let pendingError;

    // retrieve initial contents
    let stop = false, empty = false;
    do {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          pendingContent = (value !== undefined) ? value : null;
        } else {
          stop = empty = true;
        }
      } catch (err) {
        if (err instanceof Interruption) {
          // we're done here if we have managed to obtain something
          if (pendingContent !== undefined || allowEmpty) {
            stop = true;
          }
        } else if (err instanceof Abort) {
          stop = true;
        } else if (pendingContent !== undefined) {
          // we have retrieved some content--draw it first then throw the error inside <Sequence/>
          pendingError = err;
          stop = true;
        } else if (err.name !== 'AbortError') {
          // throw the error now so "loading" of lazy component fails
          throw err;
        }
      }
    } while (!stop);

    let currentContent = pendingContent;
    let currentError;
    let redrawComponent;

    // retrieve the remaining items from the generator unless an error was encountered
    // or it's empty already
    if (!empty && !pendingError) {
      retrieveRemaining();
    } else {
      await iterator.return();
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
      }, [ pendingError ])
      return currentContent;
    }

    function updateContent(urgent) {
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
          } else {
            stop = true;
          }
        } catch (err) {
          if (err instanceof Interruption) {
            updateContent(false);
          } else if (err instanceof Abort) {
            stop = true;
          } else {
            throwError(err);
            stop = true;
          }
        }
      } while (!stop);
      updateContent(true);
      await iterator.return();
    }
  });

  // create the component
  const lazyEl = createElement(Lazy);
  if (suspensionKey) {
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
