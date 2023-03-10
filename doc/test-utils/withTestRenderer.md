# withTestRenderer(element, callback[, options]) <sup>async</sup>

Render an element using [React Test Render](https://reactjs.org/docs/test-renderer.html) and run tests 
against it

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

* `element` - `<ReactElement>` Component to be rendered
* `callback` - `<AsyncFunction>` Function that will make assertions
* `options` - `{ timeout }`

## options

* `timeout` - `<number>` The maximum diration in milliseconds to wait for the first stoppage point
(defaults to 2000). Applicable to subsequent calls to [`resolve`](./resolve.md#readme) and [`reject`](./reject.md#readme)
as well. 

## Methods

* `act` - [act()](https://reactjs.org/docs/test-renderer.html#testrendereract) from
[react-test-renderer](https://reactjs.org/docs/test-renderer.html)
* [`awaiting`](./awaiting.md#readme)
* [`displayed`](./displayed.md#readme)
* [`displaying`](./displaying.md#readme)
* [`reject`](./reject.md#readme)
* `renderer` - instance of [react-test-renderer](https://reactjs.org/docs/test-renderer.html)
* [`resolve`](./resolve.md#readme)
* [`showing`](./showing.md#readme)
* [`shown`](./shown.md#readme)
* [`timeout`](./timeout.md#readme)
* [`unmount`](./unmount.md#readme)
* [`update`](./update.md#readme)
