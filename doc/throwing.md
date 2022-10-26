## throwing(value)

Mark a value as something that should be thrown instead of being returned to the caller

### Syntax

```js
on.imageLoad(throwing(err));
```

```js
const img = new Image();
img.src = url;
img.onload = on.imageLoad;
img.onerror = on.imageLoad.apply(throwing);
await eventual.imageLoad;
```

### Parameters

* `value` - `<Error>` or `<ErrorEvent>` or `<string>`
