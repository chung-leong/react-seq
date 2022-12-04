# renderInChildProc(location, buildPath, options)

Render an app on the server-side in a child process

## Syntax

```js
const location = `${req.protocol}://${req.hostname}/${path}`;
const stream = renderInChildProc(location, buildPath);
```

## Parameters

* `location` - `<string>`
* `buildPath` - `<string>`
* `options` - `{ timeout, type, polyfill, onMessages }`
* `return` `<ReadableStream>`

## Options

* `timeout` -
* `type` -
* `polyfill` -
* `onMessages` -
