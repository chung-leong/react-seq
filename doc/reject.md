# reject(err)

Cause a rejection of the promise currently being awaiting upon

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
  return useSequential(async function*({ trap, reject }) {
    trap('error', err => reject(err));
  });
```

## Notes

Used for redirecting error captured by root-level error boundary into a generator to be handled by its `catch` block.

Nothing happens if active generator is not awaiting a promise from the [event manager](./manageEvents.md).

Not present when `REACT_APP_SEQ_NO_EM` is set.
