# renderInChildProc(location, buildPath, options)

Render an app on the server-side in a child process

## Syntax

```js
const location = `${req.protocol}://${req.hostname}/${path}`;
const stream = renderInChildProc(location, buildPath);
```

## Parameters

* `location` - `<string>` Fully qualified URL of the page requested
* `buildPath` - `<string>` Path to the app's production build
* `options` - `{ timeout, type, polyfill, onMessages }`
* `return` `<ReadableStream>`

## Options

* `timeout` - `<number>` Maximum duration in millisecond for which the child process is allowed to run (defaults to 5000)
* `type` - `<string>` Type of app package (defaults to "cra", the only supported type currently)
* `polyfill` - `<string>` Path to a JavaScript that will be loaded by the child process
* `onMessages` - `<Function>` A callback function that receives console messages emitted from the app

## Notes

During development, [`renderToInnerHTML`](../client/renderToInnerHTML.md) can be used on the client 
side to simulate server-side generated contents.
