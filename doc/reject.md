# reject(err)

Cause a rejection of the promise currently being awaited

## Providers

* [`useSequential`](useSequential.md#readme)
* [`useProgressive`](useProgressive.md#readme)
* [`useSequentialState`](useSequentialState.md#readme)
* [`useProgressiveState`](useProgressiveState.md#readme)

## Syntax

```js
  return useSequential(async function*({ wrap, reject }) {
    wrap(children => <ErrorBoundary onError={reject}>{children}</ErrorBoundary>);
  });
```

## Notes

`reject` is used mainly for redirecting error captured by root-level 
[error boundary](https://reactjs.org/docs/error-boundaries.html) into a generator, where it can be handled 
by the generator function's `catch` block. It can also be used for other "unexpected" events, such as 
the user clicking on a global navigation element or use the back button while filling out a form.

[`wrap`](./wrap.md#readme) can be used to place an error boundary around contents outputted by a generator.

If the active generator is not awaiting a promise from the [event manager](./manageEvents.md#readme), the error will be kept
until an await occurs.

Not present when `REACT_APP_SEQ_NO_EM` is set.

## Examples

* [Transition](../examples/transition/README.md#readme)
