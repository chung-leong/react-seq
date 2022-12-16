# useProgressiveState(cb, deps)

Return a object whose properties that grow over time as data arrives

## Syntax

```js
function ProductPage({ productId }) {
  const [ state, on ] = useProgressiveState(async function({ defer, initial, usable }) => {
    initial({});
    defer(100);
    usable({
      producer: true,   // undefined is acceptable
      related: true,    
      reviews: true,    
    });
    const product = await fetchProduct(productId);
    // no await for the following calls
    const producer = fetchProducer(product);  
    const related = fetchRelatedProducts(product);
    const reviews = fetchProductReviews(product);
    return { product, producer, related, reviews };
  }, [ productId ]);
  const { product, producer, related, reviews } = state;
  /* ... */
}
```

## Parameters

* `cb` - `<AsyncFunction>`
* `deps` - `<any[]>`
* `return` `<Object>`

## Callback function

* `funcs` `<Object>` An object containing configuration functions
* `return` `{ [key]: <Promise>|<AsyncGenerator>|<Generator>|<any> }`

## Configuration and management functions

* [defer](./defer.md)
* [flush](./flush.md)
* [initial](./initial.md)
* [manageEvents](./manageEvents.md)
* [mount](./mount.md)
* [signal](./signal.md)
* [usable](./usable.md)
