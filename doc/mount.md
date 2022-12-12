# mount()

Return a promise that is fulfilled when the component is mounted

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ mount }) {
    await mount();
    /* ... */
  }, [ id ]);
}
```

## Parameters

* `return` `<Promise>` A promise that will be fulfilled when the component is mounted

## Notes

Awaiting `mount` guarantees the execution of the generator function's `finally` block. Components that needs to
roll back side effects should perform this.

Awaiting `mount` could lead to a deadlock situation when [`suspend`](./suspend.md) is used. A component need to
unsuspend first (by yielding something) then await `mount`.

The returned promise becomes fulfilled only if the mount operation isn't immediately followed by an unmount.
