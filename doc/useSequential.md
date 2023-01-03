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

* [`defer`](./defer.md)
* [`fallback`](./fallback.md)
* [`flush`](./flush.md)
* [`manageEvents`](./manageEvents.md)
* [`mount`](./mount.md)
* [`reject`](./reject.md)
* [`signal`](./signal.md)
* [`suspend`](./suspend.md)
* [`unsuspend`](./unsuspend.md)
* [`wrap`](./wrap.md)

## Notes

`useSequential` also accepts an async function returning an async generator:

```js
  return useSequential(async ({ fallback }) => {
    fallback(<Loading />);
    const { main } = await import('./main.js');
    return main();
  });
```

Async generators themselves can yield async generators. This allows you to break one long sequence into multiple
sub-routines. For error handling purpose, sub-generators yielded by a generator are handled as though their items'
retrieval take place within the calling function. The following:

```js
  try {
    /* ... */
    yield subroutine();
  } catch (err) {
    /* ... */
  }
```

Is equivalent to:

```js
  try {
    /* ... */
    for await (const item of subroutine()) {
      yield item;
    }
  } catch (err) {
    /* ... */
  }
```

In both cases errors thrown by `subroutine()` will be caught by the catch block. If `subroutine` itself calls
another async generator function, errors arising there too will be caught.
