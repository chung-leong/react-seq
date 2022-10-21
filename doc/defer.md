# defer(delay, limit = Infinity)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer }) {
    defer(100, 1000);
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

* `delay` - `<number>`
* `limit` - `<number>`

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)
