# useProgressiveState(cb, deps)

Return a object whose properties that grow over time as data arrives

## Syntax

```js
function ProductPage({ productId }) {
  const [ state, on ] = useProgressiveState(async function({ defer, initial }) => {
    initial({});
    defer(100);
    const product = await fetchProduct(productId);
    // no await for the following calls
    const producer = fetchProducer(product);  
    const related = fetchRelatedProducts(product);
    const reviews = fetchProductReviews(product);
    return { product, producer, related, reviews };
  }, [ productId ]);
  const { product, producer, related, reviews } = state;
  /* ... */
}
```

## Parameters

* `cb` - `<AsyncFunction>`
* `deps` - `<any[]>`
* `return` `<Object>`

## Callback function parameters

* `methods` `<Object>` An object containing the hook's methods
* `return` `{ [key]: <Promise>|<AsyncGenerator>|<Generator>|<any> }`

## Configuration and management methods

* [`defer`](./defer.md)
* [`flush`](./flush.md)
* [`initial`](./initial.md)
* [`manageEvents`](./manageEvents.md)
* [`mount`](./mount.md)
* [`reject`](./reject.md)
* [`signal`](./signal.md)
* [`usable`](./usable.md)

## Notes

`useProgressiveState` works in a completely analogous way as [`useProgressive`](./useProgressive.md).
Consult its documentation for more information.

Since states returned by `useProgressiveState` are always objects, its default initial state is `{}`, unlike
[`useSequentialState`](./useSequentialState.md), which has `undefined` as its default initial state.

## Examples

* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md)
* [NPM Search](../examples/npm-input/README.md)
