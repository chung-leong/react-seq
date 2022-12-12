# throwing(value)

Mark a value as something that should be thrown instead of being returned

## Syntax

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

## Parameters

* `value` - `<Error>` or `<ErrorEvent>` or `<string>`

## Notes

Error objects are normally returned by promises of `eventual` just like any other value. Wrapping the value with
`throwing` tells the event manager that the promise should be rejected with the error instead.

If the object given is a `<ErrorEvent>`, its `.error` property will be used as the rejection value.

If a string is given, an generic `<Error>` object will be created with the string as its message.
