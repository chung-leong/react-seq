# Payment form example


## Seeing the code in action

Go to the `examples/payment` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

## Payment page

```js
export function PaymentPage() {
  return useSequential(async function*({ fallback, manageEvents }) {
```

The [first line of the function](./src/PaymentPage.js#L5) is a call to
[`useSequential`](../../doc/useSequential.md). The argument is an anonymous async generator function, which will yield
the contents of our component. Using object destructuring we obtain a pair of function from the hook: `fallback` and
`manageEvents`. The former is used immediately on the next line:

```js
  fallback(<PaymentLoading />);
```

This set the fallback placeholder. It'll be on screen until our generator produces the first content. Before that
happens we need to know what payment methods are available to the user, which in real life might depend on he
where lives, what the product is, and so forth. We load the code responsible dynamically and calls
`getPaymentMethods` to obtain the list:

```js
  // load code related to making payments
  const { getPaymentMethods, processPayment } = await import('./payment.js');
  // get the available payment methods
  const methods = await getPaymentMethods();
```

We then preload the form used for each method so that when the user select a method, we can display the correct form
immediately:

```js
  // load input forms for the different methods
  const forms = {};
  for (const method of methods) {
    const module = await import(`./PaymentMethod${method.name}.js`);
    forms[method.name] = module[`PaymentMethod${method.name}`];
  }
```

Finally we load the selection screen:

```js
  const { PaymentSelectionScreen } = await import('./PaymentSelectionScreen.js');
```

Now we're ready to take down the fallback placeholder and show some real content:

```js
  const [ on, eventual ] = manageEvents();
  let success = false;
  let method = null;
  while (!success) {
    if (!method) {
      yield <PaymentSelectionScreen methods={methods} onSelect={on.selection} />;
      method = await eventual.selection;
    }
```

Initially, we don't know what is the user's preferred method of payment. So we show the selection screen. Later, if
for some reason we need to start over, we skip this step.

We use the `yield` operator to hand contents to React. Here we have a `<PaymentSelectionScreen />`. Its `onSelect` is
set to `on.selection`. Where is this `on.selection` coming from?

The two objects returned by `manageEvents` on [line 20](./src/PaymentPage.js#L20), `on` and `eventual`, are
[JavaScript proxy objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).
Their properties are dynamically generated. `eventual` automatically generates promises while `on` automatically
generates handlers that resolve them.

This bit of magic provided by the event manager represents the key advantage of using React-seq. It allows you to
use React in a more imperative fashion. Instead of passively reacting to events, you proactively seek out an answer.
The prompt-and-wait-for-response logic you see above in a way is reminiscent of the sort of console programs you might
have written in your first-year CS class:

```c
  int success = FALSE;
  int method = 0;
  while (!success) {
    if (!method) {
      printf("Select a payment method [1-%d]: ", method_count);
      scanf("%d\n", &method);
    }
```

Moving on.

```js
  const PaymentMethod = forms[method.name];
  yield <PaymentMethod onSubmit={on.response} onCancel={on.response.cancel} />;
  const { PaymentProcessingScreen } = await import('./PaymentProcessingScreen.js');
  // wait for user to submit the form or hit cancel button
  const response = await eventual.response;
  if (response === 'cancel') {
    // go back to selection screen
    method = null;
    continue;
  }
```

An alternative way to implement the logic above would be to await on a separate `cancel` promise:

```js
  yield <PaymentMethod onSubmit={on.response} onCancel={on.cancel.bind(null)} />;
  const response = await eventual.response.or.cancel;
  if (!response) {
    method = null;
    continue;
  }
```

The cancel handler is bound to `null`. If we
