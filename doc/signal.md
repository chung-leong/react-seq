# signal

Signal from an instance of [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal)
which fires when the component is unmounted or when dependencies of the hook change

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)
* [`useSequentialState`](useSequentialState.md)
* [`useProgressiveState`](useProgressiveState.md)

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

React-seq will ignore AbortError errors arising from the cancellation of fetch operations. There is no need to put
a try block around these.

[`delay`](delay.md) also accepts an optional `signal`.

[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) is an event emitter.
You can use its `addEventListener()` to listen for abort event.

## Examples

* [Star Wars API](../examples/swapi/README.md)
* [Word Press](../examples/wordpress.md)
* [Nobel Prize API](../examples/nobel/README.md)
* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md)
* [Word Press (React Native)](../examples/wordpress-react-native.md)
* [Star Wars API (server-side rendering)](../examples/swapi-ssr/README.md)
* [NPM Search](../examples/npm-input/README.md)
