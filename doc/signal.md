# sequential(cb)

Signal from an instance of [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal)
which fires when the component is unmounted or when dependencies of the hook change.

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ signal }) {
    const data = await fetch(`https://romaneseuntdom.us/aquaduct/${id}`, { signal });
    /* ... */
  }, [ id ]);
}
```

## Notes

React-seq will ignore the AbortError error arising from the cancellation of a fetch operation. There is no need to use
a try block.

[`delay()`](delay.md) also accepts an optional `signal`.

[AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) is an event emitter. You can use its `addEventListener()` to listen for abort event. 
