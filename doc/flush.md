# flush(use = true)

Perform deferred update immediately or abandon it

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)
* [`useSequentialState`](useSequentialState.md)
* [`useProgressiveState`](useProgressiveState.md)

## Parameters

* `use` - `<boolean>` If true, the pending update will not occur
* `return` The pending content or state

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, flush }) {
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

`flush(false)` can be used in a catch block to abandon incomplete updates.

`flush(true)` probably has no real usage scenarios.

## Examples

* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md)
