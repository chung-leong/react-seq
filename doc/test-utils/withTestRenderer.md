# withTestRenderer(element, callback[, options]) <sup>async</sup>

## Syntax

```js
test('payment form', async () => {
  await withTestRenderer(<PaymentForm />, async ({ awaiting, showing, shown, resolve }) => {
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

## Methods

* `act` - [act()](https://reactjs.org/docs/test-renderer.html#testrendereract) from
[react-test-renderer](https://reactjs.org/docs/test-renderer.html)
* [`awaiting`](./awaiting.md)
* [`displayed`](./displayed.md)
* [`displaying`](./displaying.md)
* [`reject`](./reject.md)
* `renderer` - instance of [react-test-renderer](https://reactjs.org/docs/test-renderer.html)
* [`resolve`](./resolve.md)
* [`showing`](./showing.md)
* [`shown`](./shown.md)
* [`timeout`](./timeout.md)
* [`unmount`](./unmount.md)
* [`update`](./update.md)
