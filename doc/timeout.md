# timeout([limit, newFallback])

Set the maximum amount of time the fallback content can be displayed
(i.e. for how long the component can stay [suspended](https://reactjs.org/docs/react-api.html#reactsuspense))

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, fallback, timeout }) {
    fallback(<spinner />);
    timeout(4000, <spinner>Please be patient</spinner>);
    const a = await fetchA(id);
    yield (
      <div>
        <SectionA data={a} />
      </div>
    );
    const b = await fetchB(a.b_id);
    yield (
      <div>
        <SectionA data={a} />
        <SectionB data={b} />
      </div>
    );
  }, [ id ])
}
```

## Parameters

* `limit` - `<number>` Maximum amount of time to wait for the first item from a generator before resorting to
new fallback content (or state). No change to current setting if omitted.
* `newFallback` - `<Element>` or `<AsyncFunction>` The new fallback element. If it's a function, it'll be called
and its returned value used as the fallback. No change if omitted.
* `return` `<number>` The actual limit, taking into consideration the limit imposed by [`limitTimeout`](./limitTimeout.md)

## Timeout Explained

The use of `timeout` primarily concerns server-side rendering (SSR). While the fallback content can be displayed
indefinitely on the client-side, a server expected to handle many requests cannot afford to keep a stream open for
long. A component must exit from its suspended state at some point so that
[`renderToPipeableStream`](https://reactjs.org/docs/react-dom-server.html#rendertopipeablestream)'s `onAllReady`
event fires and the stream closes. `timeout` accomplishes this by basically telling React that the component is
ready (even though it's not) and putting in place some new fallback content.

## Notes

You can use [limitTimeout](./limitTimeout.md) to set a minimum timeout value globally. This allows you to lower
the timeout on the server-side without impacting the client-side.

Use [abort](./abort.md) in the callback function to abort the generator if you don't want it to continue running.
