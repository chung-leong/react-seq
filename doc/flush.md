# flush(fn)

Perform deferred update immediately

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer }) {
    defer(500);
    yield 'Hello';
    flush();    // display 'Hello' now
    /* ... */
  });
}
```

## Notes

A flush will happen automatically when the generator function awaits a promise from the
[event manager](./manageEvents.md).

This function probably has no real usage scenarios.
