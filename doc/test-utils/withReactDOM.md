# withReactDOM(element, callback[, options]) <sup>async</sup>

Render an element into the DOM and run tests against it

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

* `element` - `<ReactElement>` Component to be rendered
* `callback` - `<AsyncFunction>` Function that will make assertions
* `options` - `{ timeout }`

## options

* `timeout` - `<number>` The maximum diration in milliseconds to wait for the first stoppage point
(defaults to 2000). Applicable to subsequent calls to [`resolve`](./resolve.md) and [`reject`](./reject.md)
as well. 

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
