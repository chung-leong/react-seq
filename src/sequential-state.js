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
  useEffect(() => {
    setState(initialState);
    setError();
    return () => abortController.abort();
  }, [ initialState, abortController ]);
  if (error) {
    throw error;
  }
  return [ state, on, eventual ];
}

export function sequentialState(cb, setState, setError) {
  const abortController = new AbortController();
  const { signal } = abortController;
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal });
  methods.defer = (delay) => {
    iterator.setDelay(delay);
  };

  // let callback manages events with help of promises
  let eventManager;
  if (!process.env.REACT_SEQ_NO_EM) {
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

  function updateState(urgent, conditional = false) {
    if (conditional) {
      if (iterator.delay > 0 && !unusedSlot) {
        // wait for interruption
        return;
      }
    }
    if (pendingState !== undefined) {
      const newState = pendingState;
      pendingState = undefined;
      if (urgent) {
        setState(newState);
      } else {
        startTransition(() => {
          setState(newState);
        });
      }
      unusedSlot = false;
    } else {
      unusedSlot = true;
    }
  }

  function throwError(err) {
    setError(err);
  }

  async function retrieveRemaining() {
    let stop = false, aborted = false;
    do {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          pendingState = (value !== undefined) ? value : null;
          updateState(false, true);
        } else {
          stop = true;
        }
      } catch (err) {
        if (err instanceof Interruption) {
          updateState(false);
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
      updateState(true);
    }
    await iterator.return();
  }
}
