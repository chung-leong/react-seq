# usable(arg)

Control whether content update occurs when the data set is incomplete

## Providers

* [`useProgressive`](useProgressive.md#readme)
* [`useProgressiveState`](useProgressiveState.md#readme)

## Syntax

```js
function Product({ id }) {
  return useProgressive(async ({ fallback, type, usable, signal }) => {
    fallback(<Spinner />);
    type(ProductUI);
    usable({ producer: 1, categories: 1 });
    const product = await fetchProduct(id);
    return {
      product,
      producer: fetchProducer(product.producer_id, { signal }),
      categories: fetchProductCategories(product.category_ids, { signal }),
      reviews: fetchProductReviews(product.id, { signal }),
    };
  }, [ id ]);
}
```

## Parameters

* `arg` - `<number>` or `<Function>` or `{ [key]: <number>|<Function> }` When the argument is a `<number>`, 
it indicates the minimum number of items an array needs to have. When it is a `<Function>`, it is called with 
the array as parameter to determine whether the prop is usable at the given moment. When it is an `<Object>`, 
it's expected to contain the usability criteria for each individual property.

## Usability Explained

By default, `useProgressive` and `useProgressiveState` assume that props can be empty. If the call to `usable` in 
the example above were omitted, the first element created by `useProgressive` would have the following props:

```js
{ 
  product: [object], 
  producer: undefined, 
  categories: undefined, 
  reviews: undefined 
}
```

The call to `usable` tells `useProgressive` to wait until there's one producer record and one category record. So 
the first element will actually have the following props:

```js
{ 
  product: [object], 
  producer: [object], 
  categories: [ 
    [object] 
  ], 
  reviews: undefined 
}`
```

(under the assumption that `categories` are fetched one at a time and `reviews` don't arrive first)

## Notes

Specify a usability of `Infinity` if you want a prop to be fully resolved prior to rendering of the target 
component.

You can call `usable` multiple times. For instance, you can set a default to all props then specify a tighter
restriction on one prop:

```js
usable(1);
usable({ categories: 5 })
```

In addition to the property in question, usability-check functions are called with a second parameter: `props`. It
contains the current values of all props. You can potentially use it to determine whether the prop is usable
based on the length of another prop.

## Examples

* [Star Wars API](../examples/swapi/README.md#readme)
* [Word Press](../examples/wordpress.md#readme)
* [Word Press (React Native)](../examples/wordpress-react-native.md#readme)
* [Star Wars API (server-side rendering)](../examples/swapi-ssr/README.md#readme)
