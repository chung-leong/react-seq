# useProgressive(cb, deps)

## Syntax

```js
function ProductPage({ productId }) {
  return useProgressive(async ({ type, defer, fallback }) => {
    type(ProductPageUI);
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const relatedProducts = fetchRelatedProducts(product);
    return { product, relatedProducts }
  }, [ productId ]);
}

function ProductPageUI(product, relatedProducts = []) {
  /* ... */
}
```

## Parameters

* `cb` - `<AsyncFunction>`
* `deps` - `<any[]>`
* `return` `<Element>`

## Examples

```js
function ProductPage({ productId }) {
  return useProgressive(async ({ type, defer, fallback }) => {
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const relatedProducts = fetchRelatedProducts(product);
    switch (product.type) {
      case 'toy':
        type(await import('./ProductPageUIToy.js'));
        break;
      case 'computer':
        type(await import('./ProductPageUIComputer.js'));
        break;
      case 'lingerie':
        type(await import('./ProductPageUILingerie.js'));
        break;
      default:
        type(ProductPageUI);
        break;
    }
    return { product, relatedProducts }
  }, [ productId ]);
}
```
