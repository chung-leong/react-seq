import { useMemo, useEffect, useState, startTransition } from 'react';
import { IntermittentIterator, Interruption, Timeout } from './iterator.js';
import { EventManager } from './event-manager.js';
import { Abort, isAbortError } from './utils.js';

export function useSequentialState(cb, deps) {
  return useFunctionState(sequentialState, cb, deps);
}

export function useFunctionState(fn, cb, deps) {
  if (!deps) {
    throw new Error('No dependencies specified');
  }
  const { initialState, abortController, on, eventual } = useMemo(() => {
    return fn(cb, state => setState(state), err => setError(err));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const [ state, setState ] = useState(initialState);
  const [ error, setError ] = useState();

  // when strict mode is used, the component will get mounted twice in rapid succession
  // we can't abort immediately on unmount, as the component can be remount immediately
  // schedule the operation on the next tick instead so there's a window of opportunity
  // to cancel it
  let abortPromise, abortCancelled = false;
  function scheduleAbort() {
    if (!abortPromise) {
      abortPromise = Promise.resolve().then(() => {
        abortPromise = null;
        if (!abortCancelled) {
          abortController.abort()
        }
      })
    }
    abortCancelled = false;
  }
  function cancelAbort() {
    if (abortPromise) {
      abortCancelled = true;
    }
  }

  useEffect(() => {
    setState(initialState);
    setError();
    cancelAbort();
    return () => scheduleAbort();
  }, [ initialState, abortController ]);
  if (error) {
    throw error;
  }
  return [ state, on, eventual ];
}

export function sequentialState(cb, setState, setError) {
  const abortController = new AbortController();
  const { signal } = abortController;

  // methods passed to callback functions (including abort signal)
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal });
  methods.defer = (delay) => {
    iterator.setDelay(delay);
  };

  // let callback manages events with help of promises
  let eventManager;
  if (!process.env.REACT_APP_SEQ_NO_EM) {
    methods.manageEvents = (options = {}) => {
      const { on, eventual } = new EventManager({ ...options, signal });
      eventManager = { on, eventual };
      return [ on, eventual ];
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

  return {
    initialState,
    abortController,
    ...eventManager
  };

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
