import { useMemo, useEffect, useState, useContext, startTransition } from 'react';
import { IntermittentIterator, Interruption } from './iterator.js';
import { EventManager } from './event-manager.js';
import { AbortManager } from './abort-manager.js';
import { InspectorContext } from './inspector.js';
import { Abort, isAbortError, linearize } from './utils.js';
import { setting } from './settings.js';

export function useSequentialState(cb, deps) {
  return useFunctionState(sequentialState, cb, deps);
}

export function useFunctionState(fn, cb, deps) {
  const inspector = useContext(InspectorContext);
  if (deps) {
    deps.push(inspector);
  }
  const { initialState, abortManager } = useMemo(() => {
    return fn(cb, s => setState(s), e => setError(e), { inspector });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const [ state, setState ] = useState(initialState);
  const [ error, setError ] = useState();
  useEffect(() => {
    setState(initialState);
    setError();
    abortManager.onMount();
    return () => abortManager.onUnmount();
  }, [ initialState, abortManager ]);
  useMemo(() => {
    inspector?.dispatch({ type: 'state', state });
  }, [ state, inspector ]);
  if (!deps) {
    // stat hooks go into nasty infinite loops when deps is omitted--we don't allow it
    throw new Error('No dependencies specified');
  }
  if (error) {
    inspector?.dispatch({ type: 'error', error });
    throw error;
  }
  return state;
}

export function sequentialState(cb, setState, setError, options = {}) {
  const {
    inspector,
  } = options;
  const abortManager = new AbortManager();
  const { signal } = abortManager;

  // methods passed to callback functions (including abort signal)
  const methods = { signal };

  // let callback set content update delay
  const iterator = new IntermittentIterator({ signal });
  let updateDelay = 0;
  let unusedSlot = false;
  methods.defer = (ms) => {
    updateDelay = ms;
    iterator.setInterruption(updateDelay);
    if (ms === Infinity) {
      unusedSlot = false;
    }
  };

  // let callback wait for mount
  methods.mount = (fn) => abortManager.mounted;

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
  methods.flush = () => flushFn?.();

  // let callback manages events with help of promises
  let awaiting = false;
  if (!process.env.REACT_APP_SEQ_NO_EM) {
    let eventManager;
    methods.manageEvents = () => {
      if (!eventManager) {
        const onAwaitStart = () => {
          awaiting = true;
          flushFn?.();
        };
        const onAwaitEnd = () => {
          awaiting = false;
        };
        eventManager = new EventManager({ signal, inspector, onAwaitStart, onAwaitEnd });
      }
      return [ eventManager.on, eventManager.eventual ];
    };
    methods.reject = (err) => {
      eventManager?.rejectPending(err);
    };
  }

  // create the first generator and pull the first result to trigger
  // the execution of the sync section of the code
  const generator = cb(methods);
  iterator.start(linearize(generator));
  iterator.fetch();
  sync = false;

  if (setting('ssr') !== 'server') {
    retrieveRemaining();
  } else {
    // state hooks don't run on server-side
    inspector?.dispatch({ type: 'return' });
    iterator.return().catch(err => console.error(err));
  }

  let pendingState;
  return { initialState, abortManager };

  function updateState({ conditional = false, reusable = false }) {
    if (conditional) {
      if (iterator.delay > 0 && !unusedSlot && !awaiting) {
        // wait for interruption
        return;
      }
    }
    if (pendingState !== undefined) {
      const newState = pendingState;
      pendingState = undefined;
      startTransition(() => {
        if (abortManager.mountState) {
          setState(newState);
        }
      });
      unusedSlot = false;
    } else {
      unusedSlot = reusable;
    }
  }

  function throwError(err) {
    if (abortManager.mountState) {
      setError(err);
    }
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
      updateState({});
    }
    inspector?.dispatch({ type: 'return' });
    await iterator.return();
  }
}
