# manageEvents(options = {})

Manage events with the help of automatically generated promises

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ fallback, manageEvents }) {
    fallback(<LoadingScreen />);
    const [ on, eventual ] = manageEvents();
    const { message } = await fetchData(id);
    yield (
      <div>
        <h1>{message}</h1>
        <button onClick={on.click.alpha}>Alpha</button>
        <button onClick={on.click.beta}>Beta</button>
        <button onClick={on.click.gamma}>Gamma</button>
      </div>
    );
    const selection = await eventual.click;
    switch (selection) {
      case 'alpha':
        /* ... */
    }
  })
}
```

## Parameters

* `options` - `{ warning = false }` When `warning` is true, a warning will appear in the development console whenever
a handler without a corresponding promise is called or a promise without a corresponding handler is awaited upon.

## Magical Objects: `on` and `eventual`

`manageEvent` returns two objects, `on` and `eventual`. They are JavaScript
[`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) objects.
Their properties are dynamically generated. When `on.click` is accessed, a handler gets automatically created,
which fulfills the promise returned by `eventual.click` when called.

Upon fulfillment the promise `eventual.click` vanishes. Accessing `eventual.click` again would create a new,
unfulfilled promise, waiting for `on.click` to be called.

When `on.click` is called and there is no code awaiting `eventual.click`, the event simply goes ignored. You can
change this behavior using [`important`](./important.md).

Error objects are treated like any other values. You can force the rejection of a promise using
[`throwing`](./throwing.md).

Generally, you'd access a handler and then await on a promise. The handler gets created before the promise.
While this ordering is not required, the event manager will issue an warning (if warning is turned on) as there is
a high chance the scenario is due to a typo.

## Fulfillment Value Binding

The fulfillment values of promises created by `eventual` are the argument passed to their handlers. Most often they
will be event objects. You can make a promise return specific values with the help of `bind`:

```js
yield (
  <div>
    <button onClick={on.click.bind('alpha')}>Alpha</button>
    <button onClick={on.click.bind('beta')}>Beta</button>
    <button onClick={on.click.bind('gamma')}>Gamma</button>
  </div>
);
```

Depending on which button is clicked, `eventual.click` would resolve to one of the three strings.

Functions created by `bind` are invariant, meaning the same function is returned when the same argument is given [[*](#notes)]:

```js
console.log(on.click.bind('egg') === on.click.bind('egg'));
// Output: true
```

The standard `bind(null, value)` syntax, with its pointless `this` variable, is also supported.

## String Binding Shorthand

You can bind a string to a handler simply by referencing a property by that name:

```js
yield (
  <div>
    <button onClick={on.click.alpha)}>Alpha</button>
    <button onClick={on.click.beta}>Beta</button>
    <button onClick={on.click.gamma}>Gamma</button>
  </div>
);
```

The example above is the exact equivalent to the one in the previous section.

Strings matching the names of the
[Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)
object's methods cannot to be used in this manner. These are `apply`, `bind`, `call`, `length`, `name`, `prototype`,
and `toString`.

## Promise Chaining

You can use the keyword `or` and `and` to chain multiple promises together. The former uses
[Promise.race](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) to join
two promises together, while the latter uses
[Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all).

The promise `eventual.click.or.keyPress.or.mouseOver` is equivalent to the following:

```js
Promise.race([
  Promise.race([ eventual.click, eventual.keyPress ]),
  eventual.mouseOver
]);
```

Meanwhile, `eventual.click.and.keyPress.and.mouseOver` is equivalent to:

```js
Promise.all([
  Promise.all([ eventual.click, eventual.keyPress ]).then(arr => arr.flat()),
  eventual.mouseOver
]).then(arr => arr.flat());
```

`or` and `and` are callable functions. You can use them to a promise not created by `eventual` to the chain:

```js
const res = await fetch(url, { signal });
await eventual.click.or(res.json()).or.keyPress;
```

`eventual` itself can be called to start a chain:

```js
const res = await fetch(url, { signal });
await eventual(res.json()).and.click;
```

## Imposing Time Limit

You can use the `for` keyword to put a limit on waiting time:

```js
await eventual.click.or.keyPress.for(3).minutes;
```

```js
const json = await eventual(res.json()).for(1).second;
if (json === 'timeout') {
  /* ... */
}
```

Valid time units are `millisecond`, `second`, `minute`, and `hour` (plus their plural forms).

In the example above, the promise would resolve to "timeout" if `on.click` or `on.keyPress` are not invoked within
three minutes.

## Abandoning Promises

When the component is unmounted, all outstanding promises will be rejected with an `Abort` error. To ensure that you
code does not wait indefinitely for a promise to be fulfilled, wrap it with `eventual`:

```js
const promise = someProcess();
await eventual(promise);
```

Promises from [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) don't need this protection
provided they're initiated with [signal]('./signal.md').

## Notes

Handlers created by `bind` are invariant *in most usage scenarios*. There is a limit of 128 handlers when scalar
arguments (i.e. not objects) are involved due to garbage accumulation concern. Handlers bounded to objects can be
kept in a [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
hence there is no limit to their number.
