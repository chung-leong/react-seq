# renderToServer(element[, options])

## Syntax

```js
if (typeof(window) === 'object') {
  hydrateRoot(document.getElementById('root'), <App />);
} else {
  renderToServer(<App />);
}
```

## Parameters

* `element` - `<ReactElement>`
* `options` - `<object>`
