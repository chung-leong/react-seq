# delay(ms, options = {}) <sup>`async`</sup>

Delay execution for a specific amount of time.

## Syntax

```js
await delay(30);
```

```js
const abortController = new AbortController();
const { signal } = abortController;
const value = await delay(50, { signal, value: 5 });
// value = 5
```

## Parameters

* `ms` - `<number>` Duration in milliseconds
* `options` - `{ value, signal }`
* `return` `<undefined>` or `<any>`

## Options

* `value` - `<any>` Value to be used as the function's return value
* `signal` - `<AbortSignal>` Signal from an [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
which would cause the function to throw an `Abort` error (due to a component being unmounted, for instance)
