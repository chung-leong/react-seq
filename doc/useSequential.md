# useSequential(cb, deps)

Return a React element that obtains its contents from an async generator

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

* `cb` - `<AsyncGeneratorFunction>` An async generator function that returns different contents over time
* `deps` - `<any[]>` Variables that the async generator function depends on, changes of which will cause it to be rerun
* `return` `<Element>`

## Callback function

* `funcs` `<Object>` An object containing configuration functions
* `yield`  `<Element>` or `<AsyncGenerator>`

## Configuration and management functions

* [defer](./defer.md)
* [fallback](./fallback.md)
* [flush](./flush.md)
* [manageEvents](./manageEvents.md)
* [mount](./mount.md)
* [signal](./signal.md)
* [suspend](./suspend.md)

## Notes
