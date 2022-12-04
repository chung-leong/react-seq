# withReactDOM(element, callback[, options]) <sup>async</sup>

## Syntax

```js
test('payment form', async () => {
  await withReactDOM(<PaymentForm />, async ({ awaiting, showing, shown, resolve }) => {
    expect(awaiting()).toBe('selection');
    expect(showing()).toBe(PaymentSelectionScreen);
    await resolve({ name: 'Credit-Card' });
  });
});
```

## Parameters

* `element` - `<ReactElement>`
* `callback` - `<AsyncFunction>`
* `options` - `{ timeout }`

## options

* `timeout` - `<number>`
