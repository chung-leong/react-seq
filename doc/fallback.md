# fallback(element)

Specify an element to be shown while the React-seq hook in question retrieves the first generated element

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)

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

* `element` - `<Element>` or `<Function>` If `element` is a function, it'll be called and its return value used as
the fallback element

## Notes

`element` will be handed to the [`<React.Suspense>`](https://reactjs.org/docs/react-api.html#suspense)
element wrapping the lazy component created by React-seq.

`fallback` and [`suspend`](suspend.md) cannot be used at the same time.

[`initial`](./initial.md) is the equivalent function for state hooks ([useSequentialState](useSequentialState.md),
[useProgressiveState](useProgressiveState.md)).

## Examples

* [Star Wars API](../examples/swapi/README.md)
* [Word Press](../examples/wordpress.md)
* [Transition](../examples/transition/README.md)
