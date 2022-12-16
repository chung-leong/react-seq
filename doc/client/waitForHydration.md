# waitForHydration(root) <sup>async</sup>

Wait for hydration to complete

## Syntax

```js
const root = hydrateRoot(container, app);
await waitForHydration(root);
```

## Parameters

* `root` - `<ReactRoot>`

## Notes

Current implementation uses a timer to poll the root.
