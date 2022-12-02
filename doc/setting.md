# setting(name)

Return a global setting.

## Syntax

```js
if (!setting('ssr')) {
  // running on client-side
}
```

## Parameters

* `name` - `<string>` Name of setting. It can be "ssr", "ssr_timeout", or "ssr_timeout_handler".
* `return` `<string>` or `<number>` or `<boolean>`

## Notes

See documentation of [`settings`]('./settings.md') for more information.
