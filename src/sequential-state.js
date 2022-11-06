import { useMemo, useEffect, useState, startTransition } from 'react';
import { IntermittentIterator, Interruption } from './iterator.js';
import { EventManager } from './event-manager.js';
import { AbortManager } from './abort-manager.js';
import { Abort, isAbortError } from './utils.js';

export function useSequentialState(cb, deps) {
  return useFunctionState(sequentialState, cb, deps);
}

export function useFunctionState(fn, cb, deps) {
  if (!deps) {
    throw new Error('No dependencies specified');
  }
  const { initialState, abortManager } = useMemo(() => {
    const s = fn(cb, state => setState(state), err => setError(err));
    // deal with StrictMode double invocation by shutting down one of the
    // two generators on a timer
    s.abortManager.setTimeout();
    return s;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const [ state, setState ] = useState(initialState);
  const [ error, setError ] = useState();
  useEffect(() => {
    setState(initialState);
    setError();
    abortManager.onMount();
    return () => abortManager.onUnmount();
  }, [ initialState, abortManager ]);
  if (error) {
    throw error;
  }
  return state;
}

export function sequentialState(cb, setState, setError) {
  const abortManager = new AbortManager();
  const { signal } = abortManager;

  // methods passed to callback functions (including abort signal)
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal });
  methods.defer = (delay) => {
    if (delay !== undefined) {
      iterator.setDelay(delay);
    }
    return iterator.delay;
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

  // let callback manages events with help of promises
  if (!process.env.REACT_APP_SEQ_NO_EM) {
    methods.manageEvents = (options = {}) => {
      const em = new EventManager({ ...options, signal });
      return [ em.on, em.eventual ];
    };
  }

  // let callback set initial state
  let initialState;
  let sync = true;
  methods.initial = (state) => {
    if (!sync) {
      throw new Error('Initial state must be set prior to any yield or await statement');
    }
    if (typeof(state) === 'function') {
      state = state();
    }
    initialState = state;
  };

  // permit explicit request to use pending state
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

  let pendingState;
  let unusedSlot = false;
  retrieveRemaining();

  return { initialState, abortManager };

  function updateState({ conditional = false, reusable = false }) {
    if (conditional) {
      if (iterator.delay > 0 && !unusedSlot) {
        // wait for interruption
        return;
      }
    }
    if (pendingState !== undefined) {
      const newState = pendingState;
      pendingState = undefined;
      startTransition(() => setState(newState));
      unusedSlot = false;
    } else {
      unusedSlot = reusable;
    }
  }

  function throwError(err) {
    setError(err);
  }

  async function retrieveRemaining() {
    let stop = false, aborted = false;
    flushFn = () => updateState({});
    do {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          pendingState = (value !== undefined) ? value : null;
          updateState({ conditional: true });
        } else {
          stop = true;
        }
      } catch (err) {
        if (err instanceof Interruption) {
          updateState({ reusable: true });
        } else if (err instanceof Abort) {
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
      updateState({});
    }
    await iterator.return();
  }
}
