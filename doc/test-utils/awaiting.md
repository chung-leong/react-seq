# awaiting()

Return name of promise currently being awaited

# Syntax

```js
  expect(awaiting()).toBe('submission.or.cancellation');
```

## Notes

`awaiting` returns `undefined` if no promise is being awaited (likely due to termination of the generator).
