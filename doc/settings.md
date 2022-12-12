# settings(settings)

Apply global settings.

## Syntax

```js
// prepare for server-side rendering
settings({ ssr: 'server', ssr_timeout: 1000 });
const element = createElement(App);
const stream = await renderToReadableStream(element);
```

## Parameters

* `settings` - `<object>`

## Available settings

* `ssr` - "server" or "hydrate" or `false`. When `ssr` is set to "server", content deferment delay becomes Infinity,
causing all intermediate content updates to be ignored. In addition, generators created by
[`useSequentialState`](./useSequentialState.md) and [`useProgressState`](./useProgressiveState) are immediately
shut down. Setting `ssr` to "hydrate" has the same effect on rendering deferment but has no impact on state hooks.
* `ssr_timeout` - `<number>` Duration in milliseconds within which components must yield displayable contents
during server-side rendering (i.e. `ssr` = "server"). The default is `3000`.
* `ssr_timeout_handler` - `<AsyncFunction>` or `null`. Function that gets called when a timeout occurs. Its return
value will be sent as the affected component's content. The default is `null` (component will be blank).

## Notes

The helper functions provided by [`react-seq/server`](./server-side.md) and [`react-seq/client`](./client-side.md)
will set `ssr` on your behalf. You have no need to worry about it if you choose to use the provided helpers.
