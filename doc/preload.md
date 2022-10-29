# preload(fn) <sup>`async`</sup>

Run a function in a try block, redirecting errors to the development console

## Syntax

```js
preload(async () => {
  await fetch('https://somewhere.com/picture1.png', { signal });
  await fetch('https://somewhere.com/picture2.png', { signal });
  /* ... */
})
```

## Parameters

* `fn` - `<AsyncFunction>`

## Notes

Abort errors from [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) operations are silently ignored.
