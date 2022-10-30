# persistent(value)

Mark a value being passed to a handler as persistent, such that the corresponding promise will always yield
that value

## Syntax

```js
function Widget() {
  return useSequential(async function*({ manageEvents, signal }) {
    const [ on, eventual ] = manageEvents();
    for (;;) {
      yield <button onClick={on.click.apply(persistent)}>Click once!</button>;
      await eventual.click;
      yield <div>You clicked and there is no going back!</div>;
      await delay(5000, { signal });
    }
  });
}
```

## Parameters

* `value` - `<any>`

## Notes

Normally, when the promise `eventual.<name>` is fulfilled, it is immediately removed so that the next
`await eventual.<name>` would await a fresh promise of a new event. Wrapping a value with `persistent` changes this
dynamic, so that `eventual.<name>` would from here on always immediately resolves to the given value.

It's currently unclear whether this function has any real-world application. The above example permits a
visitor to click on a button once. After that, `eventual.click` will always fulfill immediately.
