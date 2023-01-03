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
  });
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

Do not use `initial` to set default values of properties, since that opens up the possibility of the generator setting
them back to `undefined`. This is especially likely when [`useProgressiveState`](./useProgressiveState.js) is
involved. Use JavaScript's standard way of setting default values instead.

This is good:

```js
  const { products = [] } = useProgressiveState(async () => {
    /* ... */
  }, [ categoryId ])
```

This is bad:

```js
  const { products } = useProgressiveState(async ({ initial }) => {
    initial({ products: [] });
    /* ... */
  }, [ categoryId ])
```

## Examples

* [Media capture](../examples/media-cap/README.md)
