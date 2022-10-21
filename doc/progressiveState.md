# progressive(cb)

## Syntax

```js
function useProgressiveState(cb, deps) {
  const { initialState, abortController, on, eventual } = useMemo(() => {
    return progressiveState(cb, state => setState(state), err => setError(err));
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
