# type(arg)

Specify the type of element to be created by [`useProgressive`](useProgressive.md)

## Providers

* [`useProgressive`](useProgressive.md)

## Syntax

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

```js
function Product({ id }) {
  return useProgressive(async ({ fallback, type, usable, signal }) => {
    fallback(<Spinner />);
    usable({ producer: 1, categories: 1, reviews: 0 });
    const product = await fetchProduct(id);

    if (product.archived) {
      // product is not longer available--use a different UI
      type(await import('./ArchivedProductUI.js'));
      return {
        product,
        producer: fetchProducer(product.producer_id, { signal }),
      };
    }

    type(await import('./ProductUI.js'));
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

* `arg` - `<Function>` or `<Class>` or `<Module>` Type of element to create. If a `<Module>` is given, its default
export will be used.

## Notes

In theory, `arg` can be a string as well (meaning a plain-old HTML element will get created). Such usage is highly
improbable, however. [`element`](./elements the function to use if you don't wish to define a
separate component.

## Examples

* [Star Wars API](../examples/swapi/README.md)
* [Word Press](../examples/wordpress.md)
* [Word Press (React Native)](../examples/wordpress-react-native.md)
* [Star Wars API (server-side rendering)](../examples/swapi-ssr/README.md)
