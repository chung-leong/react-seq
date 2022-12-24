# usable(arg)

Control whether content update occurs when the data set is incomplete

## Providers

* [`useProgressive`](useProgressive.md)
* [`useProgressiveState`](useProgressiveState.md)

## Syntax

```js
function Product({ id }) {
  return useProgressive(async ({ fallback, type, usable, signal }) => {
    fallback(<Spinner />);
    type(ProductUI);
    usable(0);
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

```js
function Product({ id }) {
  return useProgressive(async ({ fallback, type, usable, signal }) => {
    fallback(<Spinner />);
    type(ProductUI);
    usable({ producer: 1, categories: 1, reviews: 0 });
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

* `arg` - `<number>` or `<function>` or `<Object>` When the argument is a `<number>`, it indicates the
minimum number of items an array needs to have. When it is a `<function>`, it is called with the array as parameter
to determine whether the prop is usable at the given moment. When it is an `<Object>`, it's expected to contain
the usability criteria for each individual property.

## Usability Explained

By default, `useProgressive` would wait until all properties have been fully resolved before rendering a component (
or returning the state in case of [useProgressiveState](./useProgressiveState.md)). This behavior is obviously
not very progressive. A visitor would end up staring at a spinner for a long time.

`usable` lets you tell the hook that it's okay to render with an incomplete data set, that the target component
is capable of handling missing data.

The first example above uses `usable(0)` to indicate that all props can be empty. `product` would never be empty,
of course, since it's retrieved already, but the others props will be empty at the beginning, assuming `fetchProducer`
returns a promise to an object, `fetchProductReviews` returns a promise to an array, and `fetchProductCategories`
returns an async generator. `useProgressive` immediately creates a `<ProductUI />` with the following props:

```js
{ product: [object], producer: undefined, categories: undefined, reviews: undefined }
```

The second example has more stringent requirements: `producer` must be present and `categories` must have at least one
element, while `reviews` can be empty. The first `<ProductUI />` that gets created will thus have the following props:

```js
{ product: [object], producer: [object], categories: [ [object] ], reviews: undefined }`
```

(the assumptions here are that `reviews` doesn't arrive first and `categories` are fetched one at a time)

## Notes

You can call `usable` multiple times. For instance, you can set a default to all props then specify a tighter
restriction on one prop:

```js
usable(0);
usable({ producer: 1 })
```

In addition to the property in question, usability-check functions are called with a second parameter: `props`. It
contains the current values of all props. You can potentially use it to determine whether the prop is usable
based on the length of another prop.

## Examples

* [SWAPI Example](../examples/swapi/README.md)
