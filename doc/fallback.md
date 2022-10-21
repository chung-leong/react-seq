# fallback(element)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ fallback }) {
    fallback(<span>Initializing...</span>);
    const { taskA, taskB, taskC } = await import('./task.js');
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

* `element` - `<Element>` or `<Function>`

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
