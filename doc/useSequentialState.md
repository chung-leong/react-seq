# useSequentialState(cb, deps)

## Syntax

```js
function ProductPage({ productId }) {
  const [ state, on ] = useSequentialState(async function({ defer, initial }) => {
    initial({});
    defer(100);
    const product = await fetchProduct(productId);
    yield { product };
    const related = await fetchRelatedProducts(product);
    yield { product, related };
    /* ... */
  }, [ productId ]);
  const { product, related } = state;
  /* ... */
}
```

## Parameters

* `cb` - `<AsyncGeneratorFunction>`
* `deps` - `<any[]>`
* `return` `[ state, on, eventual ]`
