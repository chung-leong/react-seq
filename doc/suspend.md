# suspend(key = undefined)

## Syntax

```js
const DialogBox = React.lazy(() => import('./dialogbox.js'));

function Widget({ id }) {
  const form = useSequential(async function*({ suspend }) {
    suspend();
    /* ... */
  }, [ id ]);
  const elementB =
  return (
    <Suspense fallback={<Spinner/>}>
      <DialogBox>{form}</DialogBox>
    </Suspense>
  );
}
```

## Parameters

* `key` - `<String>`
