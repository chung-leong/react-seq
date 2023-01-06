# resolve(object) <sup>async</sup>

Force the currently awaited promise to be fulfilled with a particular value set

# Syntax

```js
  expect(awaiting()).toBe('submission.or.cancellation');
  await resolve({ submission: { number: '123 456' } });
```

# Parameters

* `object` - <Object> An object containing fulfillment values keyed by their names

# Notes

Currently there is no check on whether the supplied object is valid.
