# extendDelay(multiplier)

Make content update deferment period larger for all components

## Syntax

```js
extendDelay(Infinity);
limitTimeout(1000);
const stream = renderToPipeableStream(element, {
  onAllReady: () => {
    res.setHeader('Content-type', 'text/html');
    stream.pipe(res);
  },
});
```

## Parameters

* `multiplier` - `<number>` Factor by which to increase the delay (1 = 100%)

## Notes

The main purpose of this function is to facilitate server-side-rendering (SSR). By setting the deferment period to
infinity, you can force components to render only its final appearance, bypassing all partially complete,
intermediate contents.

In theory, you can use `extendDelay` to dynamically adapt to the browser environment (reducing the number of
updates on less powerful hardware, for instance).

Components that do not employ deferment are unaffected. For our purpose, 0 x infinity is 0.
