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

* `cb` - `<AsyncGeneratorFunction>` An async generator function that outputs different contents over time
* `deps` - `<any[]>` Variables that the async generator function depends on, changes of which will cause it to be rerun
* `return` `<Element>`

## Callback function parameters

* `methods` `<Object>` An object containing the hook's methods
* `yield`  `<Element>` or `<AsyncGenerator>`

## Configuration and management methods

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
    const { default: main } = await import('./main.js');
    return main();
  });
```

Async generators themselves can yield async generators. This allows you to break one long sequence into multiple
shorter ones. For error handling purpose, sub-generators yielded by a generator are handled as though their items'
retrieval takes place within the calling function. The following:

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
another async generator function, errors arising there will be caught here too.

Use `linearize` if you have code that needs to deal with nested async generators and you want the same error
propagation behavior.

The generator function's return value is currently not used. You will get a warning during development if 
you return anything other than `undefined`.

## Examples

* [Payment form](../examples/payment/README.md)
* [Transition](../examples/transition/README.md)
* [Ink CLI](./examples/transition/README.md)
