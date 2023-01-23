# suspend([key])

Request that the element returned by the hook should not be wrapped with a
[`React.Suspense`](https://reactjs.org/docs/react-api.html#reactsuspense)

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)

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
export function Widget({ id }) {
  return useSequential(async function*({ suspend }) {
    suspend(`widget-${id}`);
    /* ... */
  }, [ id ]);
}
```

## Parameters

* `key` - `<string>` A unique key used to find the generated content during unsuspension. Must be used when the
component calling [`useSequential`](useSequential.md) or [`useProgressive`](useProgressive.md) does not wrap
the result with a [`<React.Suspense>`](https://reactjs.org/docs/react-api.html#reactsuspense) (second example). Must
not be used if it does (first example).

## Suspension Explained

By default, React-seq wraps the lazy element it creates with a `<React.Suspense>`. There are scenarios, however, where
you wouldn't want that. In the first example above, `<DialogBox>` is also a suspending component since it's loaded
using [`React.lazy`](https://reactjs.org/docs/react-api.html#reactlazy). We need to wrap it in a `<React.Suspense>`
and provide fallback content for it. Since there is a `<React.Suspense>` already, it does not make sense for `form`
to be a `<React.Suspense>` also, with its own fallback content.

In the second example, the lazy element created by [`useSequential`](./useSequential.md) is returned by `Widget` in
anticipation of the presence of a `<React.Suspense>` somewhere further up the tree. In this scenario, `key` must be
provided, since `Widget` itself will be created anew when unsuspension (i.e. replacement of fallback content with
real content) occurs. Without this key the component would end up in an infinite loop, invoking the generator
function over and over, forgetting each time it has done so already.

`key` allows React-seq to stash its work away somewhere and find it the second time around. It doesn't need to
be terribly unique. Just unique enough so there's no danger of React-seq grabbing the result of a different
component that so happens to be loading at the same time.

## Notes

`suspend` and [`fallback`](./fallback.md) cannot be used at the same time. No `<React.Suspense>` means no fallback.

A suspending component is mounted when it unsuspends (i.e. when the generator yields something). Awaiting
[`mount`](./mount.md) before that happens will cause a deadlock:

```js
export function Widget({ id }) {
  return useSequential(async function*({ suspend, mount }) {
    suspend(`widget-${id}`);
    await mount();
    const data = await fetchData();
    yield <WidgetUI data={data} />;
  }, [ id ]);
}
```

## Examples

* [Star Wars API](../examples/swapi/README.md)
* [Star Wars API (server-side rendering)](../examples/swapi-ssr/README.md)
