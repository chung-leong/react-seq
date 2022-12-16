# renderToServer(element[, options])

Render a React element as HTML, returning the result to the web server

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

## Notes

`renderToServer` passes a promise to a stream to `process.send`. The package runner will then dump the output of this
stream into stdout, which is then read by [`renderInChildProc`](../server/renderInChildProc.md). 
