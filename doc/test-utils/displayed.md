# displayed()

Return array of elements rendered between the previous stoppage point and the current stoppage point

## Syntax

```js
  expect(displayed()).toEqual(
    expect.arrayContaing(
      expect.objectContaining({
        type: PaymentMethodBLIK,
      })
    )
  );
```

## Notes

The array include the last element rendered.

Use [shown](./shown.md#readme) when you are only interested in the types of elements displayed.
