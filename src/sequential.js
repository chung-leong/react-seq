import { useMemo, useEffect, useReducer, useContext, startTransition, createElement, lazy, Suspense } from 'react';
import { IntermittentIterator, Timeout, Interruption } from './iterator.js';
import { EventManager } from './event-manager.js';
import { AbortManager } from './abort-manager.js';
import { InspectorContext } from './inspector.js';
import { Abort, nextTick, isAbortError } from './utils.js';

export function useSequential(cb, deps) {
  return useFunction(sequential, cb, deps);
}

export function useFunction(fn, cb, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inspector = useContext(InspectorContext);
  const { element, abortManager } = useMemo(() => {
    const options = { inspector, selfDestruct: true };
    return fn(cb, options);
  }, deps);
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
    selfDestruct = false,
  } = options;
  const abortManager = new AbortManager();
  const { signal } = abortManager;

  // methods passed to callback functions (including abort signal)
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal, inspector });
  methods.defer = delay => {
    if (delay !== undefined) {
      iterator.setDelay(delay);
    }
    return iterator.delay;
  };

  // let callback set timeout element (or its creation function), to be used when
  // we fail to retrieve the first item from the generator after time limit has been exceeded
  let timeoutEl;
  methods.timeout = (limit, el) => {
    if (limit !== undefined) {
      iterator.setLimit(limit);
    }
    if (el !== undefined) {
      timeoutEl = el;
    }
    return iterator.limit;
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

  // allow callback to use side effects
  methods.mount = (fn) => {
    if (fn !== undefined) {
      if (!sync) {
        throw new Error('Function must be set prior to any yield or await statement');
      }
      if (typeof(fn) !== 'function') {
        throw new TypeError('Invalid argument');
      }
      abortManager.setEffect(fn);
    }
    return abortManager.mounted;
  };

  if (!process.env.REACT_APP_SEQ_NO_EM) {
    // let callback manages events with help of promises
    methods.manageEvents = (options = {}) => {
      const { on, eventual } = new EventManager({ ...options, signal, inspector });
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

  // permit explicit request to use pending content
  let flushFn;
  methods.flush = () => {
    if (flushFn) {
      flushFn();
    }
  };

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
    let unusedSlot = false;

    // retrieve initial contents
    let stop = false, empty = false, aborted = false;
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
              const abort = () => abortManager.abort();
              const { limit } = iterator;
              timeoutEl = await timeoutEl({ limit, abort });
            }
            pendingContent = (timeoutEl !== undefined) ? timeoutEl : null;
            inspector?.dispatch({ type: 'timeout', duration: iterator.limit, content: pendingContent });
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
    let redrawComponent;

    // retrieve the remaining items from the generator unless an error was encountered
    // or it's empty already
    if (!empty && !pendingError && !aborted) {
      retrieveRemaining();
    } else {
      // don't wait for return()
      iterator.return().catch(err => console.error(err));
    }
    return { default: Sequence };

    function Sequence() {
      // trigger rerendering using useReducer()
      redrawComponent = useReducer(c => c + 1, 0)[1];
      if (currentError) {
        inspector?.dispatch({ type: 'error', error: currentError });
        throw currentError;
      }
      inspector?.dispatch({ type: 'content', content: currentContent });
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
        if (redrawComponent) {
          startTransition(redrawComponent);
        }
        unusedSlot = false;
      } else {
        unusedSlot = reusable;
      }
    }

    function throwError(err) {
      currentError = err;
      if (redrawComponent) {
        redrawComponent();
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
  } else if (selfDestruct) {
    // set self-destruct to real with extra generator created by strict mode double invocatopn
    abortManager.setSelfDestruct();
  }
  return result;
}

const savedResults = {};
const savedResultsTickCounts = {};
let tickCount = 0;

function saveForLater(key, result) {
  savedResults[key] = result;
  savedResultsTickCounts[key] = tickCount;
  // increase the tick count on the next tick
  nextTick(() => tickCount++);
}

function findPrior(key) {
  const result = savedResults[key];
  if (result && savedResultsTickCounts[key] !== tickCount) {
    // remove it on the next tick
    nextTick(() => {
      delete savedResults[key];
      delete savedResultsTickCounts[key];
    });
  }
  return result;
}
