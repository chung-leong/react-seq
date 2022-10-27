# timeout(element)

Specify the timeout content, used when 

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, fallback, timeout }) {
    defer(200, 1000);
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

## Notes
