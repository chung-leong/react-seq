# preserving(value)

Mark a value as important, not to be ignored

## Syntax

```js
on.serverMessage(preserving(msg))
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

A value wrapped with `preserving`, by contrast, would be kept until some code comes for it. The `await` operation
in the following example would complete immediately:

```js
on.click(preserving('OK'));
const button = await eventual.click;
```

`on.[name].preserve` yields a handler that preserves its argument:

```js
yield <button onClick={on.click.preserve)}>Self-Destruct</button>
```

It's equivalent to:

```js
yield <button onClick={on.click.filter(preserving)}>Self-Destruct</button>
```
