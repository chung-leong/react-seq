# meanwhile(fn) <sup>`async`</sup>

Run a function in a try block, redirecting errors to development console

## Syntax

```js
meanwhile(async () => {
  await fetch('https://somewhere.com/picture1.png', { signal });
  await fetch('https://somewhere.com/picture2.png', { signal });
  /* ... */
})
```

## Parameters

* `fn` - `<AsyncFunction>`

## Notes

Abort errors from [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) operations are silently ignored.

Although `meanwhile` is an async function, it is expected that you'd call it without using `await`. It's designed for
situation where you want some operations to occur alongside the main operation, such as preloading of remote
resources.
