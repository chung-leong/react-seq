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

* `container` - `<DOMElement>` The container DOM element
* `element` - `<ReactElement>` The app element
* `options` - `<object>` Options for 
[`renderToReadableStream`]https://reactjs.org/docs/react-dom-server.html#rendertoreadablestream

## Notes

Used for performing server-side rendering in the browser during development.
