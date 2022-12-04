# hydrateRoot(container, element[, options])

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
