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

## Methods

* `act` - [act()](https://reactjs.org/docs/test-utils.html#act) from
['react-dom/test-utils'](https://reactjs.org/docs/test-utils.html)
* [`awaiting`](./awaiting.md)
* [`displayed`](./displayed.md)
* [`displaying`](./displaying.md)
* `node` - The DOM DIV element into which the component being tested was rendered
* [`reject`](./reject.md)
* [`resolve`](./resolve.md)
* `root` - ReactDOM client root
* [`showing`](./showing.md)
* [`shown`](./shown.md)
* [`timeout`](./timeout.md)
* [`unmount`](./unmount.md)
* [`update`](./update.md)
