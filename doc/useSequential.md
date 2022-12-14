# useSequential(cb, deps)

Return a React element that obtains its contents from an async generator.

## Syntax

```js
function ProductPage({ productId }) {
  return useSequential(async function*({ defer, fallback }) {
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const { ProductDescription } = await import('./ProductDescription.js');
    yield (
      <div>
        <ProductDescription product={product}/>
      </div>
    );
    const related = await fetchRelatedProducts(product);
    const { ProductCarousel } = await import('./ProductCarousel.js');
    yield (
      <div>
        <ProductDescription product={product}/>
        <ProductCarousel products={related}/>
      </div>
    );
    /* ... */
  }, [ productId ]);
}
```

## Parameters

* `cb` - `<AsyncGeneratorFunction>`
* `deps` - `<any[]>`
* `return` `<Element>`

## Configuration and management functions

* [defer](./defer.md)
* [effect](./effect.md)
* [fallback](./fallback.md)
* [flush](./flush.md)
* [manageEvents](./manageEvents.md) <sup>`useSequential`, `useProgressive`, `useSequentialState`, `useProgressiveState`</sup>
* [mount](./mount.md)
* [signal](./signal.md)
* [suspend](./suspend.md)

## Notes
