# wrap(fn)

Add wrapper element around contents yielded by generator

## Providers

* [`useSequential`](useSequential.md)
* [`useProgressive`](useProgressive.md)

## Syntax

```js
function App() {
  return useSequential(async function*(methods) {
    const { wrap } = methods;
    const [ on, eventual ] = manageEvents();
    wrap(children => <div className="App">{children}</div>);
    yield <Welcome onAnimationEnd={on.animationEnd} />;
    await eventual.animationEnd;
    yield showEULA(methods);
    /* ... */
  });
}

async function *showEULA({ manageEvents }) {
  // use a scroll container
  const unwrap = wrap(children => <div className="scroll-container">{children}</div>)
  const [ on, eventual ] = manageEvents();
  try {
    yield <EULAPageOne onAgree={on.agreement} />;
    await eventual.agreement;
    yield <EULAPageTwo onAgree={on.agreement} />;
    await eventual.agreement;
    yield <EULAPageThree onAgree={on.agreement} />;
    await eventual.agreement;
  } finally {
    unwrap();
  }
}
```

## Parameters

* `fn` - `<Function>` A function that wraps an element with an outer element
* `return` A function that removes the wrapping function

## Notes

Multiple wrap functions can be added. They'll be called in reverse order. The function last added will produce the
innermost wrapper. The component tree of the example above will first look like this:

```js
  <div className="App">
    <Welcome onAnimationEnd={...} />
  </div>
```

When the welcome animation ends, it becomes:

```js
  <div className="App">
    <div className="scroll-container">
      <EULAPageOne onAgree={...} />;
    </div>
  </div>
```

`wrap` is useful for placing an error boundary around contents from the generator:

```js
function App() {
  return useSequential(async function*({ wrap, reject }) {
    wrap(children => <ErrorBoundary onError={reject} />{children}</ErrorBoundary>);
    try {
      yield <InputForm onSubmit={on.submission} />
      await eventual.submission;
    } catch (err) {
      // handle error from InputForm
    }
  }, []);
}
```

The code above uses [`reject`](./reject.md) to redirect errors caught by the error boundary into the generator
function.

Wrap functions do not receive all elements yielded by a generator, only those that get rendered. They will never
receive an async generator.

## Examples

* [Transition](../examples/transition/README.md)
