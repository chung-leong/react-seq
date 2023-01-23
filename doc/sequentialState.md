# sequentialState(cb, setState, setError)

Internal function used by the [`useSequentialState`](./useSequentialState) hook

## Syntax

```js
function useSequentialState(cb, deps) {
  const { initialState, abortManager } = useMemo(() => {
    return sequentialState(cb, state => setState(state), err => setError(err));
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

* `cb` - `<AsyncGenerateFunction>` User-provided generator function that continually yield different states
* `setState` - `<Function>` Callback function for setting a new state
* `setError` - `<Function>` Callback function for reporting any error encountered during execution
* `return` `{ initialState, abortManager }` Initial state of the hook and the abort manager that can put a stop to
any further state updates

## Notes

`sequentialState` work differently from [`sequential`](./sequential) in that it does not directly apply changes
after receiving data from the generator. Instead, it reports changes back to the caller via `setState`. It also
reports back any error it encountered via `setError`.

See documentation of [`sequential`](./sequential.md#notes) for details concerning the abort manager.
