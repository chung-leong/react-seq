# mount()

Return a promise that is fulfilled when the component is mounted

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)
* [`useSequentialState`](useSequentialState.md)
* [`useProgressiveState`](useProgressiveState.md)

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
roll back side effects should do this.

Awaiting `mount` could lead to a deadlock situation when [`suspend`](./suspend.md) is used. A component need to
unsuspend first (by yielding something) then await `mount`. Consider doing this instead:

```js
    mount().then(() => {
      /* ... */ 
    });
```

The returned promise becomes fulfilled only if the mount operation isn't immediately followed by an unmount.

## Examples

* [Media capture](../examples/media-cap/README.md)
* [Transition](../examples/transition/README.md)
