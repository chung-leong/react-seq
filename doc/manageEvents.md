# manageEvents()

Manage events with the help of automatically generated promises

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)
* [`useSequentialState`](useSequentialState.md)
* [`useProgressiveState`](useProgressiveState.md)

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
        <button onClick={on.alpha}>Alpha</button>
        <button onClick={on.beta}>Beta</button>
        <button onClick={on.gamma}>Gamma</button>
      </div>
    );
    const click = await eventual.alpha.or.beta.or.gamma;
    if (click.alpha) {
      /* ... */
    } else if (click.beta) {
      /* ... */
    } else {
      /* ... */
    }
  })
}
```

## Parameters

* `return` - `[ <Proxy>, <Proxy> ]` Two proxy objects, one producting handlers, the other promises. They are invariant 
per hook. Multiple calls would yield the same pair.

## Magical Objects: `on` and `eventual`

`manageEvent` returns two objects, `on` and `eventual`. They are JavaScript
[`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) objects.
Their properties are dynamically generated. When `on.click` is accessed, a handler gets automatically created.
Calling it fulfills the promise returned by `eventual.click`, also automatically generated. The value given to the 
handler will be placed in a object, keyed by the name of the handler/promise. Thus `on.click(1)` would result in 
`eventual.click` resolving to `{ click: 1 }`.

Upon fulfillment the promise `eventual.click` vanishes. Accessing `eventual.click` again would create a new,
unfulfilled promise, waiting for `on.click` to be called.

When `on.click` is called and there is no code awaiting `eventual.click`, the event would go ignored. You can
change this behavior using [`preserving`](./preserving.md) or through the use of `on.click.preserve`.

Error objects are treated like any other values. You can force the rejection of a promise using
[`throwing`](./throwing.md) or through the use of `on.click.throw`.

## Fulfillment value filtering

You can attach a filter function to a handler so that only certain values would trigger fulfillment:

```js
// respond to left click only
yield (
  <div>
    <button onClick={on.click.filter(evt => evt.button === 0 ? evt : undefined)}>OK</button>
  </div>
);
```

When the function returns something other than `undefined`, the returned value will be used as the fulfillment value.

`on.click.preserve` is the shorthand for `on.click.filter(preserving)`. `on.click.throw` is the shorthand for
`on.click.filter(throwing)`.

Functions created by `filter` are invariant, meaning the same function is returned when the same argument is
given.

## Fulfillment value binding

The fulfillment values of promises created by `eventual` are objects containing the arguments passed to their
handlers. They will often be event objects. You can make a promise return a specific value with the help of `bind`:

```js
yield (
  <div>
    <button onClick={on.click.bind('alpha')}>Alpha</button>
    <button onClick={on.click.bind('beta')}>Beta</button>
    <button onClick={on.click.bind('gamma')}>Gamma</button>
  </div>
);
```

Depending on which button gets clicked, `eventual.click` will resolve to either `{ click: 'alpha' }`,
`{ click: 'beta' }` or `{ click: 'gamma' }`.

Functions created by `bind` are invariant, meaning the same function is returned when the same argument is
given [[*](#notes)]:

```js
console.log(on.click.bind('egg') === on.click.bind('egg'));
// Output: true
```

The standard `bind(null, value)` syntax, with its pointless `this` variable, is also supported.

## Promise chaining

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

The result of the expression above will be either `{ click: [Event] }`, `{ keyPress: [Event] }`, or
`{ mouseOver: [Event] }`.

Meanwhile, `eventual.click.and.keyPress.and.mouseOver` is equivalent to:

```js
Promise.all([
  Promise.all([ eventual.click, eventual.keyPress ]).then(arr => arr.flat().reduce((a, i) => Object.assign(a, i), {})),
  eventual.mouseOver
]).then(arr => arr.flat().reduce((a, i) => Object.assign(a, i), {}));
```

The result of the expression above will be `{ click: [Event], keyPress: [Event], mouseOver: [Event] }`.

`or` and `and` are callable functions. You can use them to add a promise from elsewhere to the chain:

```js
const res = await fetch(url, { signal });
await eventual.click.or('json', res.json()).or.keyPress;
```

A name for the external promise is required.

`eventual` itself can be called to start a chain:

```js
const res = await fetch(url, { signal });
await eventual('json', res.json()).and.click;
```

## Imposing time limit

You can use the `for` keyword to put a limit on wait time:

```js
const res = await eventual.click.or.keyPress.for(3).minutes;
if (res.timeout) {
  /* ... */
}
```

In the example above, the promise will resolve to `{ timeout: 180000 }` if `on.click` or `on.keyPress` are not invoked
within three minutes.

Valid time units are `millisecond`, `second`, `minute`, and `hour` (plus their plural forms).

## Abandoning Promises

When the component is unmounted, all outstanding promises will be rejected with an `Abort` error.

## Forced rejection

You can use [`reject`](./reject.md) to force the currently awaited promise to be rejected. It's useful for 
redirecting errors from components into generator functions.

## Notes

Handlers created by `bind` are invariant *in most usage scenarios*. There is a limit of 128 handlers when scalar
arguments (i.e. not objects) are involved due to garbage accumulation concerns. Handlers bounded to objects can be
kept in a [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
hence there is no limit to their number.

Awaiting a promise from the event manager will cause an automatic [flush](./flush.md).

If you're using React-seq in a library and have no need for sophisticated event handling, you can exclude the
event manager from your build by setting the environment variable `REACT_APP_SEQ_NO_EM` to 1.

## Examples

* [Payment form](../examples/payment/README.md)
* [Word Press](../examples/wordpress.md)
* [Star Wars API (alternate implementation)](../examples/swapi-hook/README.md)
* [Word Press (React Native)](../examples/wordpress-react-native.md)
* [Media capture](../examples/media-cap/README.md)
* [Transition](../examples/transition/README.md)
