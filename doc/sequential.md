# sequential(cb)

## Syntax

```js
function useSequential(cb, deps) {
  return useMemo(() => sequential(cb), deps);
}
```

## Parameters

* `cb` - `<AsyncGeneratorFunction>`
* `return` `<Element>`
