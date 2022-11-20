# settings(object)

Apply global settings.

## Syntax

```js
// prepare for server-side rendering
settings({ ssr: 'server', ssr_time_limit: 1000 });
const element = createElement(App);
const stream = await renderToReadableStream(element);
```

## Parameters

* `name` - `<object>`

## Available settings

* `ssr` - `"server"` or `"hydrate"` or `false`.
* `ssr_time_limit` - `<number>`
* `strict_mode_clean_up` - `<number>`

## Notes
