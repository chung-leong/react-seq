# sequential(cb)

Internal function used by the [`useSequential`](./useSequential) hook

## Syntax

```js
function useSequential(cb, deps) {
  const { element, abortManager } = useMemo(() => sequential(cb), deps);
  useEffect(() => {
    abortManager.onMount();
    return () => {
      abortManager.onUnmount()
    };
  }, [ abortManager ]);
  return element;
}
```

## Parameters

* `cb` - `<AsyncGeneratorFunction>` User-provided generator function that continually yield different contents
* `return` `{ element, abortManager }` React element that continually updates itself with content from the generator
and the abort manager that can put a stop to all that

## Notes

`sequential` extracts contents from the generator created by `cb` and continually update the returned element.
It will also direct this element to throw any error it encounters, during rerendering, so that the error can be
caught by an [error boundary](https://reactjs.org/docs/error-boundaries.html).

The hook function ([`useSequential`](./useSequential)) doesn't need to do anything
aside from ensuring that `sequential` is only called again when dependencies change (with the help of
[`useMemo`](https://reactjs.org/docs/hooks-reference.html#usememo)) and handling mount/mount events (with the help
of [`useEffect`](https://reactjs.org/docs/hooks-reference.html#useeffect)).

`AbortManager` is a subclass of [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
It has added methods related to the React component lifecycle. `onMount` is responsible for invoking the function
given to [`effect`](./effect.md). It will trigger fulfillment of the promise returned by [`mount`](./mount.md).
`onUnmount` is responsible for invoking the clean-up function returned by the function given to
[`effect`](./effect.md). It will initiate an abort of the generator unless the component is immediately remounted
(something that happens when [strict mode](https://reactjs.org/docs/strict-mode.html) is used).
