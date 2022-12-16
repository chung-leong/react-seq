# renderToInnerHTML(container, element[, options]) <sup>async</sup>

Render a React element into HTML, assigning it afterward to a DOM node's innerHTML property

## Syntax

```js
if (process.env.NODE_ENV === 'development') {
  await renderToInnerHTML(container, app);
}
const root = hydrateRoot(container, app);
```

## Parameters

* `container` - `<DOMElement>`
* `element` - `<ReactElement>`
* `options` - `<object>`

## Notes

Used for performing server-side rendering in the browser during development.
