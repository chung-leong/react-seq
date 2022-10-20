import { useMemo, useEffect, useState, startTransition } from 'react';
import { IntermittentIterator, Interruption, Timeout, Abort } from './iterator.js';
import { EventManager } from './event-manager.js';

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
  const iterator = new IntermittentIterator(signal);
  function defer(ms) {
    iterator.setDelay(ms);
  }

  // let callback manages events with help of promises
  let eventManager;
  function manageEvents(options = {}) {
    const { on, eventual } = new EventManager(signal, options);
    eventManager = { on, eventual };
    return [ on, eventual ];
  }

  // let callback set initial state
  let initialState;
  let sync = true;
  function initial(state) {
    if (!sync) {
      throw new Error('Fallback component must be set prior to any yield or await statement');
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
  const generator = cb({ defer, manageEvents, initial, signal });
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
    let stop = false;
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
          pendingContent = timeoutState;
          stop = true;
        } else if (err instanceof Interruption) {
          updateState(false);
        } else if (err instanceof Abort) {
          stop = true;
        } else if (err.name !== 'AbortError') {
          throwError(err);
          stop = true;
        }
      }
    } while (!stop);
    updateState(true);
    await iterator.return();
  }
}
