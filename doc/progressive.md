# progressive(cb)

Internal function used by the [`useProgressive`](./useProgressive) hook

## Syntax

```js
function useProgressive(cb, deps) {
  const { element, abortManager } = useMemo(() => progressive(cb), deps);
  useEffect(() => {
    abortManager.onMount();
    return () => {
      abortManager.onUnmount()
    };
  }, [ abortManager ]);
  return element;
}
```

## Parameters

* `cb` - `<AsyncFunction>` User-provided function that creates a set of async props
* `return` `{ element, abortManager }` React element that progressively renders itself base on incoming data
and the abort manager that can put a stop to all that

## Notes

`progressive` calls [`sequential`](./sequential.md#readme) internally, with a generator function feeding off the
generator created by [`generateProps`](./generateProps.md#readme), using properties returned by the callback.

See documentation of [`sequential`](./sequential.md#notes) for details concerning the abort manager.
