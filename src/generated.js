import { useMemo, useEffect, useReducer, startTransition, createElement, lazy, Suspense } from 'react';
import { IntermittentIterator, Interruption, Abort } from './iterator.js';
import { createEventManager } from './events.js';

export function useGeneratedState(cb, deps) {
  const { initialState, abortController, on, eventual } = useMemo(() => {
    return generatedState(cb, (state) => dispatch({ state }), (error) => dispatch({ error }));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const [ { state, error }, dispatch ] = useReducer((prev, next) => {
    return { ...prev, ...next };
  }, { state: initialState, error: null });
  useEffect(() => {
    return () => abortController.abort();
  }, [ abortController ]);
  if (error) {
    throw error;
  }
  return [ state, on, eventual ];
}

export function generatedState(cb, setState, setError) {
  const abortController = new AbortController();
  const { signal } = abortController;

  // let callback set content update delay
  const iterator = new IntermittentIterator();
  function defer(ms) {
    iterator.setDelay(ms);
  }

  // let callback manages events with help of promises
  let eventManager;
  function manageEvents(options) {
    const { on, eventual, reject } = createEventManager(options);
    signal.addEventListener('abort', () => reject(new Abort), { signal });
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

  // create the first generator and pull the first result to trigger
  // the execution of the sync section of the code
  const generator = cb({ defer, manageEvents, initial, signal });
  iterator.start(generator);
  iterator.fetch();
  sync = false;

  let pendingState;

  // stop iterator when abort is signaled
  signal.addEventListener('abort', () => iterator.throw(new Abort()), { signal });
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
        if (err instanceof Interruption) {
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
