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
    const producer = fetchProducer(product.producer_id);
    const relatedProducts = fetchRelatedProducts(product);
    return { product, relatedProducts }
  }, [ productId ]);
}

function ProductPageUI(product, producer, relatedProducts = []) {
  /* ... */
}
```

## Parameters

* `cb` - `<AsyncFunction>` An async function that sets up data sources and configure the operation
* `deps` - `<any[]>` Variables that the async function depends on, changes of which will cause it to be rerun
* `return` `<Element>`

## Callback function

* `funcs` `<Object>` An object containing configuration functions
* `return` `{ [key]: <Promise>|<AsyncGenerator>|<Generator>|<any> }`

## Configuration and management functions

* [`defer`](./defer.md)
* [`element`](./element.md)
* [`fallback`](./fallback.md)
* [`flush`](./flush.md)
* [`manageEvents`](./manageEvents.md)
* [`mount`](./mount.md)
* [`reject`](./reject.md)
* [`signal`](./signal.md)
* [`suspend`](./suspend.md)
* [`type`](./type.md)
* [`usable`](./usable.md)
* [`unsuspend`](./unsuspend.md)
* [`wrap`](./wrap.md)

## Progressive loading explained

In a nutshell, `useProgressive` translates async "stuff" like promises and async generators into regular JavaScript
data structures like objects and arrays. The example above creates three props. `product` is a regular object (since
`await` was used). `producer` is a promise to an object (since `await was not used`). `relatedProducts` is an async
generator that yields objects. The final props that `ProductPageUI` receives will be:

```js
{
  product: {...},
  producer: {...},
  relatedProducts: [
    {...},
    {...},
    {...},
  ]
}
```

By default, `useProgressive` assumes that props can be empty. Thus the first element it yields will have the following
props:

```js
{
  product: {...},
  producer: undefined,
  relatedProducts: undefined
}
```

You can use [`usable`](./usable.md) to impose minimum requirements. If `usable(1)` were added to the code, the first
element would have these props:

```js
{
  product: {...},
  producer: {...},
  relatedProducts: [
    {...}
  ]
}
```

If `usable({ producer: 1 })` were used instead, the props would be:

```js
{
  product: {...},
  producer: {...},
  relatedProducts: undefined
}
```

By default, the arrival of each item from a generator would cause an update. If the prop set has 3 generators, each
yielding 100 times, then 300 updates would eventually occur. Generally you would use [`defer`](./defer.md) to limit
the number of updates. The example above uses a delay of 100 milliseconds. That means at most 10 updates can happen
in a second. If all 300 async operations required by our hypothetical component finish in 3 seconds, then only 30
updates would occur. If they finish in less than 100 milliseconds (due to caching, for instance), then only a single
update would occur.

## Notes

You can catch errors encountered during data retrieval using an [error boundary](https://reactjs.org/docs/error-boundaries.html).

`useProgressive` uses [`useSequential`](./useSequential.md) and [`generateProps`](./generateProps.md) internally. With the help of
these two functions you can with implement your own hook that provide additional functionalities.

`type` accepts a JavaScript module. You can target different interface components in the following manner:

```js
function ProductPage({ productId }) {
  return useProgressive(async ({ type, defer, fallback }) => {
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const producer = fetchProducer(product.producer_id);
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
    return { product, producer, relatedProducts }
  }, [ productId ]);
}
```

## Examples

* [Star Wars API](../examples/swapi/README.md)
* [Word Press](../examples/wordpress.md)
* [Word Press (React Native)](../examples/wordpress-react-native.md)
* [Star Wars API (server-side rendering)](../examples/swapi-ssr/README.md)
