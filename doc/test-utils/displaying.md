# displaying()

Return the element being displayed currently

## Syntax

```js
  expect(displaying()).toEqual(
    expect.objectContaining({
      type: PaymentMethodBLIK,
    })
  );
```

## Notes

`displaying` basically returns the last item of the array from [`displayed`](./displayed.md#readme).
