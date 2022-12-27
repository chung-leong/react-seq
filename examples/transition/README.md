# Transition example

_

_

_


## Seeing the code in action

Go to the `examples/transition` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

![screenshot](./img/screenshot-1.jpg)

## Crossfade operation

_

_

_


```js
export class Crossfade {
  constructor(methods) {
    this.methods = methods;
    this.previous = null;
    this.key = 0;
  }
```

```js
  async *run(element) {
    const { previous } = this;
    const previousKey = this.key++;
    const currentKey = this.key;
    this.previous = element;
    if (previous) {
```

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
_

_

_
