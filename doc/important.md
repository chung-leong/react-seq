# important(value)

Make a value as important, not to be ignored

## Syntax

```js
on.serverMessage(important(msg))
```

## Parameters

* `value` - `<any>`

## Notes

Normally, when a `on.[name]` handler is called and no code is awaiting on a corresponding `eventual.[name]` promise,
the value would simply be lost. For instance, the following example would stall at the `await` statement:

```js
on.click('OK');
const button = await eventual.click;
```

A value wrapped with `important`, by contrast, is kept around until some code comes for it. The `await` operation
in the following example would complete immediately:

```js
on.click(important('OK'));
const button = await eventual.click;
```
