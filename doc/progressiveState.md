# progressiveState(cb)

Internal function used by the [`useProgressiveState`](./useProgressiveState) hook

## Syntax

```js
function useProgressiveState(cb, deps) {
  const { initialState, abortManager } = useMemo(() => {
    return progressiveState(cb, state => setState(state), err => setError(err));
  }, deps);
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
```

## Parameters

* `cb` - `<AsyncFunction>` User-provided function that creates a set of async props
* `setState` - `<Function>` Callback function for setting a new state
* `setError` - `<Function>` Callback function for reporting any error encountered during execution
* `return` `{ initialState, abortManager }` Initial state of the hook and the abort manager that can put a stop to
any further state updates

## notes

`progressiveState` calls [`sequentialState`](./sequentialState.md) internally, with a generator function feeding
off the generator created by [`generateProps`](./generateProps.md) using properties returned by the callback.

See documentation of [`sequentialState`](./sequentialState.md#notes) for more details.

See documentation of [`sequential`](./sequential.md#notes) for details concerning the abort manager.
