# limitTimeout(limit)

Set a globally applicable upper limit on how long a be component can remain suspended

## Syntax

```js
extendDelay(Infinity);
limitTimeout(1000);
const stream = renderToPipeableStream(element, {
  onAllReady: () => {
    res.setHeader('Content-type', 'text/html');
    stream.pipe(res);
  },
});
```

## Parameters

* `limit` - `<number>` Number of milliseconds

## Notes

Components that do not have a timeout fallback will end up appearing as blank if their generators fail to yield
something within the imposed limit.

See [timeout](./timeout.md) for an explanation of the purpose of setting a limit.
