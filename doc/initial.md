# initial(state)

Specify the initial state of hook, before the async generator yielded anything

## Providers

* [`useSequentialState`](useSequentialState.md)
* [`useProgressiveState`](useProgressiveState.md)

## Syntax

```js
function useProductInfo(productId) {
  const info = useSequentialState(async function*({ initial }) {
    // specify an empty object to keep the destructure operator from throwing
    initial({});
    const product = await fetchProduct(productId);
    yield { product };
    /* ... */
    yield { product, producer, reviews };
  }, [ productId ]);
  return info;
}

/* ... */

function ProductPage({ id }) {
  const { product, producer, reviews = [] } = useProductInfo(id);
  return (
    <div className="product">
      <h1>{product?.name}</h1>
      <h2>By {producer?.name}</h2>
      { /* ... */ }
    </div>
  );
}
```

## Parameters

* `state` - `<any>`

## Notes

The default initial value for [`useSequentialState`](useSequentialState.md) is `undefined`, where as the default
initial value for [`useProgressiveState`](useProgressiveState.md) is an empty object (since that hook always returns
objects).

Do not use `initial` with [`useProgressiveState`](./useProgressiveState.md). See the hook's documentation for an 
explanation.

## Examples

* [Media capture](../examples/media-cap/README.md)
