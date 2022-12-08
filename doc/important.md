# important(value)

Mark a value as important, not to be ignored

## Syntax

```js
on.serverMessage(important(msg))
```

## Parameters

* `value` - `<any>`

## Notes

Normally, when a `on.[name]` handler is called and no code is awaiting `eventual.[name]`, the value would simply
be lost. For example, the following code would stall at the `await` statement:

```js
on.click('OK');
const button = await eventual.click;
```

A value wrapped with `important`, by contrast, would be kept until some code comes for it. The `await` operation
in the following example would complete immediately:

```js
on.click(important('OK'));
const button = await eventual.click;
```

`apply` can be used to create a handler that treats its argument as important:

```js
yield <button onClick={on.click.apply(important)}>Self-Destruct</button>
```
