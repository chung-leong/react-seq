# useProgressive(cb, deps)

Return a React element that displays partially completed views as data arrives

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

* `cb` - `<AsyncFunction>` An async function that sets up data sources and configure the operation
* `deps` - `<any[]>` Variables that the async function depends on, whose changes will cause it to be rerun
* `return` `<Element>`

## Configuration and management functions

* [defer](./defer.md)
* [effect](./effect.md)
* [element](./element.md)
* [fallback](./fallback.md)
* [flush](./flush.md)
* [manageEvents](./manageEvents.md)
* [mount](./mount.md)
* [signal](./signal.md)
* [suspend](./suspend.md)
* [type](./type.md)
* [usable](./usable.md)

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
