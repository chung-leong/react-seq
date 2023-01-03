# reject(err)

Cause a rejection of the promise currently being awaiting upon

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)
* [`useSequentialState`](useSequentialState.md)
* [`useProgressiveState`](useProgressiveState.md)

## Syntax

```js
  return useSequential(async function*({ trap, reject }) {
    trap('error', err => reject(err));
  });
```

## Notes

Used for redirecting error captured by root-level error boundary into a generator, where it can be handled by the
generator function's `catch` block.

If the active generator is not awaiting a promise from the [event manager](./manageEvents.md), the error will be kept
until an await occurs.

Not present when `REACT_APP_SEQ_NO_EM` is set.

## Examples

* [Tranition](../examples/transition/README.md)
