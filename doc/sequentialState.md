# sequentialState(cb, setState, setError)

## Syntax

```js
function useSequentialState(cb, deps) {
  const { initialState, abortController, on, eventual } = useMemo(() => {
    return sequentialState(cb, state => setState(state), err => setError(err));
  }, deps);
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
```

## Parameters

* `cb` - `<AsyncFunction>`
* `setState` - `<Function>`
* `setError` - `<Function>`
* `return` `{ initialState, abortController, on, eventual }`
