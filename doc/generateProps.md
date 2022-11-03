# generateProps(asyncProps, usables) <sup>`async generator`</sup>

Internal function used by [`progressive`](./progressive.md) and [`progressiveState`](./progressiveState.md)

## Syntax

```js
const asyncProps = {
  shop: fetchShopInformation(),   // promise
  products: fetchProducts(),      // async generator
  categories: fetchCategories(),  // async generator
};
const usables = {
  products: 0,
  categories: 0,
};
const generator = generateProps(asyncProps, usables);
for await (const props of generator) {
  /* ... */
}
```

## Parameters

* `asyncProps` - `<Object>`
* `usables` - `<Object>`

## Notes

See documentation for [`useProgressive`] for more details.
