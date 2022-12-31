# useSequentialState(cb, deps)

Return the latest value coming from an async generator

## Syntax

```js
function ProductPage({ productId }) {
  const { product, related } = useSequentialState(async function*({ defer, initial }) => {
    initial({});
    defer(100);
    const product = await fetchProduct(productId);
    yield { product };
    const related = await fetchRelatedProducts(product);
    yield { product, related };
  }, [ productId ]);
  /* ... */
}
```

## Parameters

* `cb` - `<AsyncGeneratorFunction>` An async generator function that returns different states over time
* `deps` - `<any[]>` Variables that the async generator function depends on, changes of which will cause it to be rerun
* `return` `<any>`

## Callback function

* `funcs` `<Object>` An object containing configuration functions
* `yield`  `<any>` or `<AsyncGenerator>`

## Configuration and management functions

* [`defer`](./defer.md)
* [`flush`](./flush.md)
* [`manageEvents`](./manageEvents.md)
* [`mount`](./mount.md)
* [`reject`](./reject.md)
* [`signal`](./signal.md)

## Notes

`useSequentialState` is not integrated with React's
[Suspension API](https://reactjs.org/docs/react-api.html#reactsuspense). During server-side rendering, it will only
return the initial state. The async generator will get shut down immediately.

Aside from the lack of Suspension API integration, `useSequentialState` works largely in the same way as
[`useSequential`](./useSequential.md). See its documentation for more details.
