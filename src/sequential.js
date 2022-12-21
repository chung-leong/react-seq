import { useMemo, useEffect, useReducer, useContext, startTransition, createElement, lazy, Suspense } from 'react';
import { IntermittentIterator, Timeout, Interruption } from './iterator.js';
import { EventManager } from './event-manager.js';
import { AbortManager } from './abort-manager.js';
import { InspectorContext } from './inspector.js';
import { Abort, isAbortError } from './utils.js';
import { setting } from './settings.js';

export function useSequential(cb, deps) {
  return useFunction(sequential, cb, deps);
}

export function useFunction(fn, cb, deps) {
  const inspector = useContext(InspectorContext);
  if (deps) {
    deps.push(inspector);
  }
  const { element, abortManager } = useMemo(() => {
    return fn(cb, { inspector });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    abortManager.onMount();
    return () => {
      abortManager.onUnmount()
    };
  }, [ abortManager ]);
  return element;
}

export function sequential(cb, options = {}) {
  const {
    inspector,
  } = options;
  const abortManager = new AbortManager();
  const { signal } = abortManager;

  // methods passed to callback functions (including abort signal)
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal, inspector });
  let updateDelay = 0;
  let unusedSlot = false;
  let ssr = setting('ssr');
  if (ssr) {
    // infinite delay when ssr is active
    iterator.setInterruption(Infinity);
    if (ssr === 'server') {
      // apply time limit on server
      iterator.setTimeLimit(setting('ssr_timeout'));
    }
  }
  methods.defer = (ms) => {
    updateDelay = ms;
    if (!ssr) {
      iterator.setInterruption(updateDelay);
      if (ms === Infinity) {
        unusedSlot = false;
      }
    }
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
  abortManager.setEffect(() => {
    if (suspensionKey) {
      // we can remove the saved lazy element now that it has mounted
      clearPrior(suspensionKey);
    }
  });

  // let callback wait for mount
  methods.mount = (fn) => abortManager.mounted;

  // let callback set fallback content
  let placeholder;
  let sync = true;
  methods.fallback = (el) => {
    if (!sync) {
      if (!placeholder) {
        throw new Error('Fallback component must be set prior to any yield or await statement');
      } else {
        return;
      }
    }
    if (suspending) {
      throw new Error('fallback() cannot be used together with suspend()');
    }
    if (typeof(el) === 'function') {
      el = el();
    }
    placeholder = el;
  };

  // permit explicit request to use pending content
  let flushFn;
  methods.flush = () => flushFn?.();

  if (!process.env.REACT_APP_SEQ_NO_EM) {
    // let callback manages events with help of promises
    let eventManager;
    methods.manageEvents = (options = {}) => {
      if (!eventManager) {
        const onAwaitStart = () => {
          // flush when deferment is infinite or we're doing ssr
          if (iterator.delay === Infinity) {
            flushFn?.();
          }
        };
        eventManager = new EventManager({ ...options, signal, inspector, onAwaitStart });
      }
      return [ eventManager.on, eventManager.eventual ];
    };
  }

  // create the first generator and pull the first result to trigger
  // the execution of the sync section of the code
  const generator = cb(methods);
  iterator.start(generator);
  iterator.fetch();
  sync = false;

  if (suspensionKey) {
    // suspensio is used, see if there's prior results
    const priorResult = findPrior(suspensionKey);
    if (priorResult) {
      // blow away the unnecessary generator
      abortManager.abort();
      return priorResult;
    }
  }

  // define lazy component Sequence
  const Lazy = lazy(async () => {
    let pendingContent;
    let pendingError;

    // retrieve initial contents
    let stop = false, finished = false, aborted = false;
    flushFn = () => {
      if (pendingContent !== undefined) {
        iterator.interrupt();
        unusedSlot = false;
      }
    };
    do {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          pendingContent = value ?? null;
          if (iterator.delay === 0 || unusedSlot) {
            stop = true;
          }
        } else {
          stop = finished = true;
        }
      } catch (err) {
        if (err instanceof Timeout) {
          // time limit has been reached--need to resolve the promise now
          if (pendingContent === undefined) {
            // we got nothing to show--call timeout handler
            if (ssr) {
              const handler = setting('ssr_timeout_handler');
              const timeoutEl = await handler?.(generator);
              pendingContent = timeoutEl ?? null;
              inspector?.dispatch({ type: 'timeout', duration: iterator.limit, content: pendingContent });
            }
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
          inspector?.dispatch({ type: 'abort', error: err });
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
    let currentError = pendingError;
    let lastSeen;
    let redrawComponent;

    if (ssr) {
      if (ssr === 'server') {
        // no need to keep going
        finished = true;
      } else {
        // set the interruption period back to normal and continue
        iterator.setInterruption(updateDelay);
        ssr = false;
      }
    }

    // retrieve the remaining items from the generator unless an error was encountered
    // or we've finished iterating through the generator already
    if (!finished && !pendingError && !aborted) {
      retrieveRemaining();
    } else {
      inspector?.dispatch({ type: 'return' });
      iterator.return().catch(err => console.error(err));
    }
    return { default: Sequence };

    function Sequence() {
      // trigger rerendering using useReducer()
      redrawComponent = useReducer(c => c + 1, 0)[1];
      if (currentError) {
        // deal with double invocation during development
        if (lastSeen !== currentError) {
          inspector?.dispatch({ type: 'error', error: currentError });
          lastSeen = currentError;
        }
        throw currentError;
      }
      if (lastSeen !== currentContent) {
        inspector?.dispatch({ type: 'content', content: currentContent });
        lastSeen = currentContent;
      }
      return currentContent;
    }

    function updateContent({ conditional = false, reusable = false }) {
      if (conditional) {
        if (iterator.delay > 0 && !unusedSlot) {
          // wait for next interruption
          return;
        }
      }
      if (pendingContent !== undefined) {
        currentContent = pendingContent;
        pendingContent = undefined;
        startTransition(() => {
          if (abortManager.mountState) {
            redrawComponent?.()
          }
        });
        unusedSlot = false;
      } else {
        unusedSlot = reusable;
      }
    }

    function throwError(err) {
      currentError = err;
      if (abortManager.mountState) {
        redrawComponent?.();
      }
    }

    async function retrieveRemaining() {
      let stop = false, aborted = false;
      pendingContent = undefined;
      flushFn = () => updateContent({});
      do {
        try {
          const { value, done } = await iterator.next();
          if (!done) {
            pendingContent = (value !== undefined) ? value : null;
            updateContent({ conditional: true });
          } else {
            stop = true;
          }
        } catch (err) {
          if (err instanceof Interruption) {
            updateContent({ resuable: true });
          } else if (err instanceof Abort) {
            inspector?.dispatch({ type: 'abort', error: err });
            stop = aborted = true;
          } else if (isAbortError(err)) {
            // quietly ignore error
            stop = true;
          } else {
            throwError(err);
            stop = true;
          }
        }
      } while (!stop);
      if (!aborted) {
        updateContent({});
      }
      inspector?.dispatch({ type: 'return' });
      await iterator.return().catch(err => console.error(err));
    }
  });

  // create the component
  const lazyEl = createElement(Lazy);
  // wrap it in a Suspense if not suspending
  const element = (suspending) ? lazyEl : createElement(Suspense, { fallback: placeholder }, lazyEl);
  const result = { element, abortManager };
  if (suspensionKey) {
    // save the result so we can find it again when we unsuspend
    saveForLater(suspensionKey, result);
  }
  return result;
}

const savedResults = {};

function saveForLater(key, element) {
  savedResults[key] = element;
}

function findPrior(key) {
  return savedResults[key];
}

function clearPrior(key) {
  delete savedResults[key];
}
