import { useMemo, useEffect, useReducer, startTransition, createElement, lazy, Suspense } from 'react';
import { TimedIterator, Interruption } from './iterator.js';
import { createEventManager } from './events.js';

export function useSequence(cb, deps) {
  return useMemo(() => sequence(cb), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function sequence(cb) {
  // let callback set content update delay
  const iterator = new TimedIterator();
  function defer(ms) {
    iterator.setDelay(ms);
  }

  // normally we wait for the first item from the generator before
  // resolving the lazy component; let callback override this
  let emptyAllowed = false;
  function allowEmpty() {
    emptyAllowed = true;
  }

  // let callback manages events with help of promises
  let rejectEvents;
  function manageEvents(options) {
    const { on, eventual, reject } = createEventManager(options);
    rejectEvents = reject;
    return [ on, eventual ];
  }

  // let callback set fallback content
  let sync = true;
  let placeholder;
  function fallback(el) {
    if (!sync) {
      throw new Error('Fallback component must be set prior to any yield or await statement');
    }
    if (typeof(el) === 'function') {
      el = el();
    }
    placeholder = el;
  }

  let fallbackUnmounted = false;
  let fallbackUnmountExpected = false;
  function Fallback({ children }) {
    useEffect(() => {
      return () => {
        fallbackUnmounted = true;
        if (!fallbackUnmountExpected) {
          if (rejectEvents) {
            rejectEvents(new Interruption);
          }
        }
      };
    });
    return children;
  }

  // create the first generator and pull the first result to trigger
  // the execution of the sync section of the code
  const generator = cb({ defer, allowEmpty, manageEvents, fallback });
  iterator.start(generator);
  iterator.fetch();
  sync = false;

  // define lazy component Sequence
  const Lazy = lazy(async () => {
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
        if (fallbackUnmounted) {
          stop = true;
        }
      } catch (err) {
        if (err instanceof Interruption) {
          // we're done here if we have managed to obtain something
          if (pendingContent !== undefined || allowEmpty) {
            stop = true;
          }
        } else if (pendingContent !== undefined) {
          // we have retrieved some content--draw it first then throw the error inside <Sequence/>
          pendingError = err;
          stop = true;
        } else {
          // throw the error now so the lazy component
          throw err;
        }
      }
    } while (!stop);

    let currentContent = pendingContent;
    let currentError;
    let redrawComponent;
    let unmounted = false;

    // retrieve the remaining items from the generator unless an error was encountered
    // or it's empty already
    if (!empty && !pendingError) {
      retrieveRemaining();
    } else {
      iterator.stop();
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
          unmounted = true;
          redrawComponent = null;
          if (rejectEvents) {
            rejectEvents(new Interruption());
          }
        };
      }, [ pendingError ])
      return currentContent;
    }

    function updateContent(urgent) {
      if (pendingContent !== undefined) {
        if (!unmounted) {
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
    }

    function throwError(err) {
      if (!unmounted) {
        currentError = err;
        if (redrawComponent) {
          redrawComponent();
        }
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
          if (unmounted) {
            stop = true;
          }
        } catch (err) {
          if (err instanceof Interruption) {
            if (unmounted) {
              stop = true;
            } else {
              updateContent(false);
            }
          } else {
            throwError(err);
            stop = true;
          }
        }
      } while (!stop);
      updateContent(true);
      iterator.stop();
    }
  });

  // create the component and wrap it in a Suspense
  const lazyEl = createElement(Lazy);
  const fallbackEl = createElement(Fallback, {}, placeholder);
  return createElement(Suspense, { fallback: fallbackEl }, lazyEl);
}
