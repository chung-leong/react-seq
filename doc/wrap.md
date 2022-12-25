# wrap(fn)

Add wrapper element around contents from generator

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)

## Syntax

```js
function Widget({ id, onError }) {
  return useSequential(async function*({ wrap }) {
    wrap(children => <ErrorBoundary onError={onError}>{children}</ErrorBoundary>);
    yield <Something />;
    /* ... */
  });
}
```

## Parameters

* `fn` - `<Function>` Function that returns a React element

## Notes

`wrap` exists mainly for inserting an [error boundary](https://reactjs.org/docs/error-boundaries.html), so that the
component using `useSequential` would not get unmounted when an error occurs.

The example code above would create the following component tree:

```html
<Widget>
  <Suspense>
    <Sequence>
      <ErrorBoundary>
        <Something />
      </ErrorBoundary>
    </Sequence>
  </Suspense>
</Widget>  
```
