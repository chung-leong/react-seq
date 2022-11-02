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

`manageEvent` returns two objects, `on` and `eventual`. They are JavaScript [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
objects. Their properties are dynamically generated. When `on.click` is accessed, a handler gets automatically created,
which would resolve the promise returned by `eventual.click`.

As shown in the example above, generally you'd access the handler then await on the promise. This ordering is not
required however. The promise could be created first in a situation like the following:

```js
yield <button onClick={() => on.click('hello')}>Hello</button>;
await eventual.click;
```

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

Strings matching the names of the [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) object's methods cannot to be used in this manner. These are `apply`, `bind`, `call`, `length`,
`name`, `prototype`, and `toString`.

## Promise Chaining

You can use the keyword `or` and `and` to chain multiple promises together. The former uses [Promise.race](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) to join two promises together, while
the latter uses [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all). The promise `eventual.click.or.keyPress.or.mouseOver` is equivalent to the following:

```js
Promise.race([ Promise.race([ eventual.click, eventual.keyPress ], eventual.mouseOver ));
```

`or` and `and` are callable functions, which you can use to add promises not created by `eventual` to the chain:

```js
const res = await fetch(url);
await eventual.click.or(res.json()).or.keyPress;
```
