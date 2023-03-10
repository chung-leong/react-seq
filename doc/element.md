# element(fn)

Supply a content generating function to [`useProgressive`](useProgressive.md#readme) in lieu of a
[component type](./type.md#readme)

## Providers

* [`useProgressive`](useProgressive.md#readme)

## Syntax

```js
function Product({ id }) {
  return useProgressive(async ({ fallback, type, usable, signal }) => {
    fallback(<Spinner />);
    element(({ product, producer, categories, reviews }) => {
      return (
        <div>
          <h1>{product.name}</h1>
          <h2>{producer.name}</h2>
          { /* ... */ }
        </div>
      )
    });
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

* `fn` - `<Function>`
