# useProgressiveState(cb, deps)

Return an object with properties that grow over time as data arrives

## Syntax

```js
function ProductPage({ productId }) {
  const [ state, on ] = useProgressiveState(async function({ defer, initial }) => {
    initial({});
    defer(100);
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

* `cb` - `<AsyncFunction>` An async function that sets up data sources and configure the operation
* `deps` - `<any[]>` Variables that the async function depends on, changes of which will cause it to be rerun
* `return` `<Object>`

## Callback function parameters

* `methods` `<Object>` An object containing the hook's methods
* `return` `{ [key]: <Promise>|<AsyncGenerator>|<Generator>|<any> }`

## Configuration and management methods

* [`defer`](./defer.md)
* [`flush`](./flush.md)
* [`initial`](./initial.md)
* [`manageEvents`](./manageEvents.md)
* [`mount`](./mount.md)
* [`reject`](./reject.md)
* [`signal`](./signal.md)
* [`usable`](./usable.md)

## Notes

`useProgressiveState` works in a completely analogous way as [`useProgressive`](./useProgressive.md).
Consult its documentation for more information.

Since states returned by `useProgressiveState` are always objects, its default initial state is `{}`, unlike
[`useSequentialState`](./useSequentialState.md), which has `undefined` as its default initial state.

Do not use [`initial](./initial.md) to set default properties, as they can get overwritten by `undefined`. 
The following is incorrect:

```js
  const { categories, tags } = useProgressiveState(async ({ initial, signal }) => {
    initial({ categories: [], tags: [] });
    return {
      categories: fetchCategories({ signal }), 
      tags: fetchTags({ signal }),
    };
  }, []);
```

Either `categories` or `tags` will revert to `undefined` when the other generator yields first.

Use JavaScript's standard way of assigning default values intead:

```js
  const { categories = [], tags = [] } = useProgressiveState(async ({ signal }) => {
    return {
      categories: fetchCategories({ signal }), 
      tags: fetchTags({ signal }),
    };
  }, []);
```

## Examples

* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md)
* [NPM Search](../examples/npm-input/README.md)
