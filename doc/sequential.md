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

* `cb` - `<AsyncGeneratorFunction>` User-provided generator function that continually yield different content
* `return` `{ element, abortManager }` React element that continually updates itself with content from the generator
and the abort manager that can put a stop to all that

## Notes

`sequential` extracts contents from the generator created by `cb` and continually update the element it has created.
It will also direct this element to throw any error it has encountered, during rerendering, so that the error can be
caught by an error boundary. The outer hook function ([`useSequential`](./useSequential)) doesn't need to do anything
aside from ensuring that `sequential` is only called again when dependencies change (with the help of
[`useMemo`](https://reactjs.org/docs/hooks-reference.html#usememo)) and handling mount/mount events (with the help
of [`useEffect`](https://reactjs.org/docs/hooks-reference.html#useeffect)).

`AbortManager` is a subclass of [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
It has added methods related to the React component lifecycle. `onMount` is responsible for invoking the function
given to [`mount`](./mount.md). It will also cancel any pending abort. `onUnmount` is responsible for invoking the
clean-up function returned by the function given to [`mount`](./mount.md). It will initiate an abort of the
generator unless the user-provided clean-up function countermands this default behavior.
