# timeout(element)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, timeout }) {
    defer(100, 1000);
    timeout(<span>Please be patient</span>);
    yield <span>Performing A...</span>
    await taskA();
    yield <span>Performing B...</span>
    await taskB();
    yield <span>Performing C...</span>
    await taskC();
    yield <span>Finish</span>
  }, [ id ])
}
```

## Parameters

* `element` - `<Element>` or `<AsyncFunction>`
