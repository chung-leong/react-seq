# settings(settings)

Apply global settings.

## Syntax

```js
// prepare for server-side rendering
settings({ ssr: 'server', ssr_time_limit: 1000 });
const element = createElement(App);
const stream = await renderToReadableStream(element);
```

## Parameters

* `settings` - `<object>`

## Available settings

* `ssr` - "server" or "hydrate" or `false`. When `ssr` is set to "server", components that use [defer](./defer.md) will see the delay gets extended to Infinity, causing all intermediate content updates to be ignored. In addition,
generators created by [`useSequentialState`](./useSequentialState.md) and
[`useProgressState`](./useProgressiveState) are immediately shutdown after returning their initial states. Setting
`ssr` to "hydrate" has the same effect on rendering deferment but no impact on the state hooks.
* `ssr_time_limit` - `<number>` Duration in milliseconds within which components must yield displayable contents
during server-side rendering (i.e. `ssr` = "server" or "hydrate"). Failing to do so means the use of the [timeout](./timeout.md) content or blank if none is set. The default is 3000.

## Notes

The helper functions provided by `react-seq/server` and `react-seq/client` will set `ssr` on your behalf. You
have no need to worry about it if you choose to use these helpers.
