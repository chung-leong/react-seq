# hydrateRoot(container, element[, options])

Enable SSR mode then hydrate a container with the given element

## Syntax

```js
if (typeof(window) === 'object') {
  hydrateRoot(document.getElementById('root'), <App />);
} else {
  renderToServer(<App />);
}
```

## Parameters

* `container` - `<DOMElement>`
* `element` - `<ReactElement>`
* `options` - `<object>`
* `return` `<ReactRoot>`

## Notes

`options` are passed unmodified to React-DOM's
[hydrateRoot](https://reactjs.org/docs/react-dom-client.html#hydrateroot).

You can use [`renderToInnerHTML`](./renderToInnerHTML.md) to simulate server generated contents during development.
