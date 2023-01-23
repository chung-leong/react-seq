# unsuspend(fn)

Set a function that is called when the element returned by the hook unsuspend (i.e. just before the
  [`fallback`](./fallback.md) is taken down)

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)

## Syntax

```js
function Widget({ id, onError }) {
  const [ ready, setReady ] = useState(false);
  const element = useSequential(async function*({ unsuspend }) {
    unsuspend(() => setReady(true));
    yield <Something />;
    /* ... */
  }, [ id ]);
  return (
    <div>
      <TopNavigation disabled={!ready} />
      {element}
    </div>
  )
}
```

## Parameters

* `fn` - `<Function>` Function that will be called when the element unsuspend
