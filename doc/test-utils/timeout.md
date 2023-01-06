# timeout() <sup>async</sup>

Force awaited promise to resolve to `{ timeout: [duration] }`

# Syntax

```js
  expect(awaiting()).toBe('submission.or.cancellation.for(10).minutes');
  await timeout();
```

## Notes

An exception is thrown if the promise has no time limit.
