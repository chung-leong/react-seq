# generateProps(asyncProps, usability) 

Internal function used by [`progressive`](./progressive.md#readme) and [`progressiveState`](./progressiveState.md#readme)

## Syntax

```js
const asyncProps = {
  shop: fetchShopInformation(),   // promise
  products: fetchProducts(),      // async generator
  categories: fetchCategories(),  // async generator
};
const usability = {
  shop: 1
};
const generator = generateProps(asyncProps, usability);
for await (const props of generator) {
  /* ... */
}
```

## Parameters

* `asyncProps` - `{ [key]: <Promise>|<AsyncGenerator>|<Generator>|<any> }`
* `usability` - `{ [key]: <number>|<Function> }`
* `return` <AsyncGenerator>

## Notes

See documentation for [`useProgressive`](./useProgressive.md#readme) and [`usable`](./usable.md#readme) for more details.

`usability` must be an object. An empty object means no minimum requirements for all props. 

## Examples

* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md#readme)
