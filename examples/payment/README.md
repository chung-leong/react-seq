# Payment form example


## Seeing the code in action

Go to the `examples/payment` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

![screenshot](./img/screenshot-1.jpg)

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

This bit of magic provided by the event manager represents one of the key advantages of using React-seq. It allows
you to use React in a more imperative fashion. Instead of passively reacting to events, you proactively seek out an
answer. The prompt-and-wait-for-response logic you see above in a way is reminiscent of the sort of console programs
you might have written in your first-year CS class:

```c
  int success = FALSE;
  int method = 0;
  while (!success) {
    if (!method) {
      printf("Select a payment method [1-%d]: ", method_count);
      scanf("%d\n", &method);
    }
```

This style of programming is easier to understand since it's closer to how we humans communicate. Debugging is easier
too, the execution point doesn't jump all over the place.

Anyway, let us move on. Now that the user has selected a method, we display the corresponding form, passing `on.response`
as the `onSubmit` handler and `on.response.cancel` as the `onCancel` handler:

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

The latter is syntactic sugar for `on.response.bind('cancel')`. When it's called, it fulfills the promise
`eventual.response` with the string "cancel". If that's what we get then we know the user has clicked the cancel
button and we respond by clearing `method` and restarting from the top of the loop.

An alternative way to implement the logic above would be to await on a separate `cancel` promise:

```js
  yield <PaymentMethod onSubmit={on.response} onCancel={on.cancellation.bind(null)} />;
  const { PaymentProcessingScreen } = await import('./PaymentProcessingScreen.js');
  const response = await eventual.response.or.cancellation;
  if (!response) {
    method = null;
    continue;
  }
```

We would still use `bind`, so that we're not dependent on the form calling the handler with the right argument.

While the user is filling the form, we use the occasion to load in the next screen. In theory, if the user types
really really fast, he could submit form before we start waiting for the response. There're ways we can fix this.
Given how unlikely it is and how minor is the consequence, we'll just let it be.

Once we have the user response, we call a function to process the payment, putting up a new screen first:

```js
yield <PaymentProcessingScreen method={method} />;
try {
  const payment = await processPayment(method, response);
  const { PaymentCompleteScreen } = await import('./PaymentCompleteScreen.js');
  yield <PaymentCompleteScreen payment={payment} />;
  success = true;
} catch (err) {
  const { PaymentErrorScreen } = await import('./PaymentErrorScreen.js');
  yield <PaymentErrorScreen error={err} onConfirm={on.confirmation} />;
  await eventual.confirmation;
}
```

Since, this is just a demo the function doesn't do anything except randomly failing on occasions. If that happens we
load `PaymentErrorScreen` and wait for the user to click a button before starting the loop again. Otherwise we load
`PaymentCompleteScreen` and exit the loop.

## Logging

If you open the Development Console, you'll see a log of various events that occur as you interact with the
form:

![screenshot](./img/screenshot-2.jpg)

Logging is activated by the presence of an `InspectorContext`:

```js
export default function App() {
  const logger = useMemo(() => new ConsoleLogger(), []);
  return (
    <div className="App">
      <header className="App-header">
        <p>Payment Page Example</p>
      </header>
      <InspectorContext.Provider value={logger}>
        <PaymentPage />
      </InspectorContext.Provider>
    </div>
  );
}
```

React-seq's inspector interface is also used for unit testing.

## Unit testing

React-seq provides a basic mechanism for unit-testing components that uses its hooks:

```js
test('payment with BLIK', async () => {
  await withTestRenderer(<PaymentPage />, async ({ awaiting, showing, shown, resolve }) => {
    expect(awaiting()).toBe('selection');
    expect(showing()).toBe(PaymentSelectionScreen);
    await resolve({ name: 'BLIK', description: 'Payment using BLIK' });
    expect(awaiting()).toBe('response');
    expect(showing()).toBe(PaymentMethodBLIK);
    await resolve({ number: '123 456' });
    expect(awaiting()).toBe(undefined);
    expect(shown()).toContain(PaymentProcessingScreen);
    expect(showing()).toBe(PaymentCompleteScreen);
  });
});
```

`withTestRenderer` will render a component and wait for it to reach a stoppage point, either an await on a promise
from the event manager or termination of the generator. After checking that it's awaiting and showing what's expected,
you can then force the component to go down a particular path by manually resolving the promise it's waiting for.

The test script above will fail half the time due to the random failure built into the example. A real test
script, with proper mocking, would haven't this kind of unpredictability.
