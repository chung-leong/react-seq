# useSequentialState(cb, deps)

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

* `cb` - `<AsyncGeneratorFunction>`
* `deps` - `<any[]>`
* `return` `[ state, on, eventual ]`

## Configuration and management functions

* [defer](./defer.md)
* [effect](./effect.md)
* [flush](./flush.md)
* [manageEvents](./manageEvents.md)
* [mount](./mount.md)
* [signal](./signal.md)
