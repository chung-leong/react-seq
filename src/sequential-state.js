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

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal });
  function defer(delay, limit) {
    iterator.setDelay(delay, limit);
  }

  // let callback manages events with help of promises
  let eventManager;
  function manageEvents(options = {}) {
    const { on, eventual } = new EventManager({ ...options, signal });
    eventManager = { on, eventual };
    return [ on, eventual ];
  }

  // let callback set initial state
  let initialState;
  let sync = true;
  function initial(state) {
    if (!sync) {
      throw new Error('Initial state must be set prior to any yield or await statement');
    }
    if (typeof(state) === 'function') {
      state = state();
    }
    initialState = state;
  }

  // let callback set timeout state (or its creation function), to be used when
  // we fail to retrieve the first item from the generator after time limit has been exceeded
  let timeoutState;
  function timeout(el) {
    timeoutState = el;
  }

  // create the first generator and pull the first result to trigger
  // the execution of the sync section of the code
  const generator = cb({ defer, manageEvents, initial, timeout, signal });
  iterator.start(generator);
  iterator.fetch();
  sync = false;

  let pendingState;
  retrieveRemaining();

  return {
    initialState,
    abortController,
    ...eventManager
  };

  function updateState(urgent) {
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
        } else {
          stop = true;
        }
      } catch (err) {
        if (err instanceof Timeout) {
          // time limit has been reached and we got nothing to show
          // reach for the timeout element
          if (typeof(timeoutState) === 'function') {
            timeoutState = await timeoutState();
          }
          pendingState = timeoutState;
          updateState(true);
        } else if (err instanceof Interruption) {
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
