# Transition example

React-seq is useful for tasks that require time. A very good example is page transition. By definition that always
takes place over time. Initially, only the old page is shown. Then both the old page and the new page are partially
visible. Finally, only the new page is shown.

This example will show you how natural it is to deal with page transition using async generator. It'll also
introduce you to the yield-await-promise (YAP) model of building a web application.

## Seeing the code in action

Go to the `examples/transition` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

![screenshot](./img/screenshot-1.jpg)

## Crossfade operation

First of all, let us look at the code responsible for performing page transition. We're not going to be overly
ambitious here. We'll going to implement a relatively simple transition: a crossfade. The old page will go from an
opacity of 1 to 0, while the new page will go from an opacity of 0 to 1.

From inside a [`useSequential`](../../doc/useSequential.md) hook we can yield either a React element or an async
generator representing a sequence of React elements. That makes implementing page transition very easy. Instead of
doing this:

```js
  yield <ScreenAlfa />
```

Which would cause `ScreenAlfa` to immediately replace what was there before, we would need to do this:

```js
  yield f(<ScreenAfla />);
```

Where `f` returns an async generator whose last item is `<ScreenAfla />`. Items coming before will be what
the transition effect dictates. They could be, in theory, anything and in any number. For the purpose of this
example we'll stick with basic CSS. Over the course of the transition, three things need to be rendered:

1. The old page with opacity = 1 and the new page with opacity = 0
2. The old page with final opacity = 0 and the new page with final opacity = 1
3. The new page only

We'll need to keep track of the screen that's presently being shown. For that we use a class.
Here's the constructor of [Crossfade](./src/Crossfade.js):

```js
export class Crossfade {
  constructor(methods) {
    this.methods = methods;
    this.previous = null;
    this.key = 0;
  }
```

The generator function starts with this:

```js
  async *run(element) {
    const { previous } = this;
    const previousKey = this.key++;
    const currentKey = this.key;
    this.previous = element;
    if (previous) {
```

Transition only makes sense, obviously, when there's something to transition from. So we only perform it when there
is a previous screen. We also ensure that the previous and the current screen are rendered using different keys.

```js
      const { manageEvents } = this.methods;
      const [ on, eventual ] = manageEvents();
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out">{previous}</div>
          <div key={currentKey} className="in">{element}</div>
        </div>
      );
      await eventual.transitionReady.for(25).milliseconds;
```

```js
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out end" onTransitionEnd={on.transitionOut}>{previous}</div>
          <div key={currentKey} className="in end" onTransitionEnd={on.transitionIn}>{element}</div>
        </div>
      );
      await eventual.transitionIn.and.transitionOut;
```

```js
    yield (
      <div className="Crossfade">
        <div key={currentKey}>{element}</div>
      </div>
    );
  }
```

```js
  to = (element) => {
    return this.run(element);
  }

  prevent = () => {
    this.previous = null;
    this.key--;
  }
```

## Bootstrap code

_

_

_


```js
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App main={main} />
  </React.StrictMode>
);
```

## App component

_

_

_


```js
export function App({ main }) {
  const [ parts, query, rMethods, { createContext, createBoundary } ] = useSequentialRouter();
  const element = useSequential((sMethods) => {
    const methods = { ...rMethods, ...sMethods };
    const { fallback, manageEvents, reject, mount, wrap, trap } = methods;
```

```js
    wrap(createBoundary);
```

```js
    fallback(<ScreenLoading />);
```

```js
    mount().then(() => {
      let detouring;
      trap('detour', (err) => {
        if (!detouring) {
          detouring = true;
          err.onSettlement = () => detouring = false;
          reject(err);
        } else {
          err.prevent();
        }
        return true;
      });
      trap('error', (err) => {
        reject(err);
        return false;
      });
    });
```

```js
    methods.handleError = async function*(err) {
      if (err instanceof RouteChangePending) {
        await err.proceed();
      } else {
        const [ on, eventual ] = manageEvents();
        yield <ScreenError error={err} onConfirm={on.confirm} />;
        await eventual.confirm;
      }
    };
```

```js
    methods.manageRoute = (def, offset) => {
      const proxy = arrayProxy(parts, def, offset);
      return [ proxy, query ];
    };
```

```js
    methods.transition = new Crossfade(methods);
```

```js
    return main(methods);
  }, [ parts, query, createBoundary, rMethods ]);
```

```js
  return createContext(
    <div className="App">
      <div className="top-bar"><a href="/">Start</a></div>
      <div className="content">{element}</div>
    </div>
  );
}
```

```js
export async function* main(methods) {
  const { manageRoute, manageEvents, handleError, throw404, transition } = methods;
  const [ route ] = manageRoute({ screen: 0 });
  const [ on, eventual ] = manageEvents();
  const { to } = transition;
```

```js
  let charlieCount = 1;
  let deltaText = '', onDeltaText = t => deltaText = t;
```

```js
  for (;;) {
    try {
```

```js
    } catch (err) {
      console.log(err.message);
      yield handleError(err);
    }
  }
}
```

```js
      if (route.screen === undefined) {
        const { ScreenStart } = await import('./screens/ScreenStart.js');
        yield to(<ScreenStart onNext={on.alfa} />);
        await eventual.alfa;
        route.screen = 'alfa';
      } else ...
```

```js
      } else if (route.screen === 'alfa') {
        const { ScreenAlfa } = await import('./screens/ScreenAlfa.js');
        yield to(<ScreenAlfa onNext={on.bravo} />);
        await eventual.bravo;
        route.screen = 'bravo';
      } else ...
```

```js
      } else if (route.screen === 'bravo') {
        const { ScreenBravo } = await import('./screens/ScreenBravo.js');
        yield to(<ScreenBravo onNext={on.charlie} onSkip={on.delta} />);
        const res = await eventual.charlie.or.delta;
        if ('charlie' in res) {
          route.screen = 'charlie';
        } else if ('delta' in res) {
          route.screen = 'delta';
        }
      } else ...
```

```js
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          yield to(<ScreenCharlie count={charlieCount++} onNext={on.delta} />);
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            transition.prevent();
          } else {
            throw err;
          }
        }
      } else ...
```

```js
export function ScreenCharlie({ count, onNext }) {
  if (count % 3 === 0) {
    throw new ThirdTimeNotTheCharm(`Thou shalst not count to ${count}`);
  }
```

```js
      } else if (route.screen === 'delta') {
        const { ScreenDelta } = await import('./screens/ScreenDelta.js');
        try {
          yield to(<ScreenDelta text={deltaText} onText={onDeltaText} onNext={on.echo} />);
          await eventual.echo;
          route.screen = 'echo';
        } catch (err) {
          if (err instanceof RouteChangePending && deltaText.trim().length > 0) {
            transition.prevent();
            yield to(<ScreenDelta text={deltaText} onDetour={on.proceed} />);
            const { proceed } = await eventual.proceed;
            if (proceed) {
              throw err;
            } else {
              err.prevent();
              transition.prevent();
            }
          } else {
            throw err;
          }
        }
      } else ...
```      

```js
      } else if (route.screen === 'echo') {
        const { echo } = await import('./echo.js');
        yield echo(methods);
        route.screen = 'foxtrot';
      } else ...
```

```js
      } else if (route.screen === 'foxtrot') {
        const { ScreenFoxtrot } = await import('./screens/ScreenFoxtrot.js');
        yield to(<ScreenFoxtrot onNext={on.alfa} />);
        await eventual.alfa;
        route.screen = 'alfa';
      } else ...
```

```js
      } else {
        throw404();
      }
```

## Subprocedure echo
_

_

_

```js
export async function* echo(methods) {
  const { manageRoute, manageEvents, throw404, transition, replacing } = methods;
  const [ route ] = manageRoute({ screen: 1 });
  const [ on, eventual ] = manageEvents();
  const { to } = transition;
  for (;;) {
    try {
      if (route.screen === undefined) {
        replacing(() => route.screen = '1');
      } else if (route.screen === '1') {
        const { ScreenEcho1 } = await import('./screens/ScreenEcho1.js');
        yield to(<ScreenEcho1 onNext={on.next} />);
        await eventual.next;
        route.screen = '2';
      } else if (route.screen === '2') {
        /* code omitted */
      } else if (route.screen === '3') {
        /* code omitted */
      } else if (route.screen === '4') {
        const { ScreenEcho4 } = await import('./screens/ScreenEcho4.js');
        yield to(<ScreenEcho4 onNext={on.next} />);
        await eventual.next;
        delete route.screen;
        return;
      } else {
        throw404();
      }
    } catch (err) {
      throw err;
    }
  }
}
```

## Error handling

Let us return section "Charlie" and consider how an error emitted by `ScreenCharlie` would land in that
section's catch block. Here's the code once again:

```js
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          yield to(<ScreenCharlie count={charlieCount++} onNext={on.delta} />);
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            transition.prevent();
          } else {
            throw err;
          }
        }
      } else ...
```

`ScreenCharlie` isn't actually called in the try block, either directly or indirectly. How does
an error that the function emits get there then?

`ScreenCharlie` gets passed to React, which calls it to render the component. React will catch any error thrown
and search for the nearest error boundary going up the component tree. Now as you may recall, we had used `wrap`
to wrap the router's error boundary around our generator's output ([App.js, line 13](./src/App.js#13)):

```js
    wrap(createBoundary);
```

This boundary hands the error to the router, which in turns gives it to the trap function we provided
([App.js, line 27](./src/App.js#27)):

```js
      trap('error', (err) => {
        reject(err);
        return false;
      });
```

`reject` causes the current await operation to throw with the error. What and where is this operation? Well,
React would encounter the error as soon as its tries to render `ScreenCharlie` with a count divisible by three.
This happens in [Crossfade.js, line 18-23](./src/Crossfade.js#L18):

```js
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out">{previous}</div>
          <div key={currentKey} className="in">{element}</div>
        </div>
      );
```

The await statement immediately below is where the error gets rethrown again:

```js
      await eventual.transitionReady.for(25).milliseconds;
```

Since `Crossfade.run` doesn't use a try-catch block, the error will pop through (and shuts down) the generator it
has created. React-seq will catch this error and redirect it to the parent generator using
[AsyncGenerator.throw](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator/throw),
which does the following (from Mozilla):

> The throw() method of an async generator acts as if a throw statement is inserted in the generator's body at
> the current suspended position, which informs the generator of an error condition and allows it to handle the
> error, or perform cleanup and close itself.

`main`'s "current suspended position" at this point would be between [the following two lines](./src/main.js#L34):

```js
          yield to(<ScreenCharlie count={charlieCount++} onNext={on.delta} />);
          await eventual.delta;
```

And that's how the error magically ends up inside the try block.

Whowee! That error went on one heck of a trip, that's for sure! You don't need to fully understand how this all works.
Just remember that there's a mechanism in place that allows you to handle errors where doing so makes intuitively
sense.

The basic takeaway concerning error handling under the YAP model is that:

1. An error would first bubble up through the React component tree
2. If it reaches the root level error boundary, the error would get rethrown at the last `await eventual...` statement
3. The error would then bubble up through the generator tree

The last point is worth remembering. It's why the browser's back and forward buttons work when we're in the
Echo screens eventhough `echo` is not handling `RouteChangePending`. The catch block in `main` takes care of that
(by calling `handleError`). Basically, React-seq makes async generator functions work in an analogous way as
regular functions.

Before we leave the topic of error handling, let us consider the scenario where we aren't doing page transition.
Our "Charlie" section would look like this:

```js
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          yield <ScreenCharlie count={charlieCount++} onNext={on.delta} />;
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            transition.prevent();
          } else {
            throw err;
          }
        }
      } else ...
```

The code is identical except there's no `to(...)` after `yield`. What happens in this case? Exactly the same outcome,
with error is thrown by `await eventual.delta` instead.
