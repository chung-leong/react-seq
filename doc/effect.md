# effect(fn)

Provide a callback function that is invoked when the component is mounted or when dependencies of the hook change

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ mount }) {
    effect(() => {
      window.addEventListener('hashchange', onHashChange);
      return () => {
        window.removeEventListener('hashchange', onHashChange);
      };
    });
  }, [ id ]);
}
```

## Parameters

* `fn` - `<Function>` Function to be called. It can return an optional clean-up function.

## Notes

Must be called prior to any `yield` or `await` statement.

Using [`mount`](./mount.md) is generally a better approach.
