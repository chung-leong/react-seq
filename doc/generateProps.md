# generateProps(asyncProps, usability) 

Internal function used by [`progressive`](./progressive.md) and [`progressiveState`](./progressiveState.md)

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

See documentation for [`useProgressive`](./useProgressive.md) and [`usable`](./usable.md) for more details.

`usability` must be an object. An empty object means no minimum requirements for all props. 

## Examples

* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md)
