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
  shop: 1
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

See documentation for [`useProgressive`](./useProgressive.md) for more details.
