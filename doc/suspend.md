# suspend(key = undefined)

## Syntax

```js
const DialogBox = React.lazy(() => import('./dialogbox.js'));

function Widget({ id }) {
  const form = useSequential(async function*({ suspend }) {
    suspend();
    /* ... */
  }, [ id ]);
  return (
    <Suspense fallback={<Spinner/>}>
      <DialogBox>{form}</DialogBox>
    </Suspense>
  );
}
```

```js
import DialogBox from './dialogbox.js';

function Widget({ id }) {
  const form = useSequential(async function*({ suspend }) {
    suspend(`widget-${id}`);
    /* ... */
  }, [ id ]);
  return (
    <DialogBox>{form}</DialogBox>
  );
}
```

## Parameters

* `key` - `<string>`

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
