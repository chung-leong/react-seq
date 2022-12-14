# Transition example

React-seq is useful for tasks that require time. A very good example is page transition. By definition that always
takes place over time. Initially, only the old page is shown. Then both the old page and the new page are partially
visible. Finally, only the new page is shown.

This example will show you how natural it is to deal with page transition using async generator. It'll also
introduce you to the Yield-Await-Promise model of building a web application.

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

1. The old screen with opacity = 1 and the new screen with opacity = 0
2. The old screen with final opacity = 0 and the new screen with final opacity = 1
3. The new screen only

We'll need to keep track of the screen that's actively being shown. For that we use a class.
Here's the constructor of [Crossfade](./src/Crossfade.js):

```js
export class Crossfade {
  constructor(methods) {
    this.methods = methods;
    this.previous = null;
    this.previousKey = 0;
  }
```

The `to` method is responsible for performing a transition to a new screen. For ergonomic reason we want it
bound to the object. Since there's no arrow function syntax for generator functions, we resort to the following
construct:

```js
  to = (async function *(element) {
    /* ... */
  }).bind(this);
```

We first save the provided element as the previous screen (for the next call):

```js
    const { previous, previousKey } = this;
    this.previous = element;
```

If there is a previous screen and it's of a different type, we output both it and the new screen in their initial
transition states ([.Crossfade .out](./src/css/Crossfade.css#10) and [.Crossfade .in](./src/css/Crossfade.css#19)):

```js
  let currentKey;
  if (!previous || isSameType(previous, element)) {
    currentKey = previousKey;
  } else {
    currentKey = ++this.previousKey;
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

We then wait 25 milliseconds to ensure that the DOM nodes are ready. There's probably a better way to do
this. Using a timer happens to easy and reliable. I'm open to suggestion.

After the brief pause we add "end" to the classname of the two div's:

```js
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out end" onTransitionEnd={on.transitionOut}>{previous}</div>
          <div key={currentKey} className="in end" onTransitionEnd={on.transitionIn}>{element}</div>
        </div>
      );
      await eventual.transitionIn.and.transitionOut;
    } // end of if (previous)
```

That sets the transition into motion. This time we actually have an event we can wait for:
[transitionend](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event). When both transitions
are done we proceed to the final step, namely rendering only the new screen:

```js
    yield (
      <div className="Crossfade">
        <div key={currentKey}>{element}</div>
      </div>
    );
  }).bind(this);
```

This is what happens immediately when there is no previous screen or it's the same type as the incoming one.

`Crossfade` provides a second method that prevents a transition from occurring. The logic is pretty simple:

```js
  prevent = () => {
    this.previous = null;
    this.key--;
  }
```

Now let us examine how our Crossfade class is put to use.

## App component

The example app uses [Array-router](https://github.com/chung-leong/array-router), a minimalist library also used
in the other examples. The specialized hook `useSequentialRouter` is used here. It differs from `useRouter` in that
it does not trigger component updates when the route changes.

After creating the router, we call [`useSequential`](../../doc/useSequential.md). Instead of an async generator
function, we use an async function that will return an async generator:

```js
export function App({ main }) {
  const [ ready, setReady ] = useState(false);
  const [ parts, query, rMethods, { createContext, createBoundary } ] = useSequentialRouter();
  const element = useSequential(async (sMethods) => {
    const methods = { ...rMethods, ...sMethods };
    const { fallback, manageEvents, reject, mount, trap } = methods;
```

We use [`fallback`](../../doc/fallback.md) to provide a fallback element:

```js
    fallback(<ScreenLoading />);
```

We use [`unsuspend`](../../doc/unsuspend.md) to attach callback that is called when the fallback element gets
take off:

```js
    unsuspend(() => setReady(true));
```

We then wait for the component to mount, then use the router's `trap` function to capture errors caught by its
error boundary. We use [`reject`](../../doc/reject.md) to redirect the error to the active `await` statement:

```js
    await mount();
    trap('error', (err) => {
      reject(err);
      return false;
    });
```

We use `trap` again to capture "detour" events. A detour is either use of the browser's back/forward buttons or
a click on a link. It's an error object that we also redirect to the active `await` statement using `reject`:

```js
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
```

The following is the default error handler:

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

`RouteChangePending` is what gets thrown when a detour occurs. The default action is to proceed to the destination.

The following function is used to manipulate the route:

```js
    methods.manageRoute = (def) => {
      const proxy = arrayProxy(parts, def);
      return [ proxy, query ];
    };
```

And here's where we create our `Crossfade` object:

```js
    methods.transition = new Crossfade(methods);
```

Finally, we load the `main` function from a file and invoke it:

```js
    const { main } = await import('./main.js');
    return main({}, methods);
  }, [ parts, query, rMethods ]);
```

Outside the hook, we wrap the element from `useSequential` in a `Frame` component. We also add the router's
error boundary and context:

```js
  return createContext(createBoundary(<Frame ready={ready}>{element}</Frame>));
}
```

So the basic idea here is that `App` would provide the basic plumbing, while all the actions actually take place
inside `main`. Let us now look at what that function does:

## The main function

The function begins by setting up some variables:
```js
export async function* main(state, methods) {
  const { manageRoute, manageEvents, handleError, throw404, transition } = methods;
  const [ route ] = manageRoute({ screen: 0 });
  const [ on, eventual ] = manageEvents();
  const { to } = transition;
```

`manageRoute` returns a proxy object, whose `screen` property is mapped to the first part of the path. When the
path is "/alfa", `route.screen` will be "alfa".

The function then enters the main loop, which contains a try-catch block:

```js
  for (;;) {
    try {
```

The catch block uses `handleError` defined in `App`:

```js
    } catch (err) {
      console.log(err.message);
      yield handleError(err);
    }
  }
}
```

In the try block, our code checks what's in `route.screen`. Initially, the following will match:

```js
      if (route.screen === undefined) {
        const { ScreenStart } = await import('./screens/ScreenStart.js');
        yield to(<ScreenStart onNext={on.alfa} />);
        await eventual.alfa;
        route.screen = 'alfa';
      } else ...
```

[`ScreenStart`](./src/ScreenStart.js) is dynamically loaded. We then use `to` in `CrossFade` to transition to it.
Since, there is no previous screen, `to` will yield the element and immediately return. We then begin awaiting the
promise `eventual.alfa`, which is fulfilled when `on.alfa` is called.

Well, that's the basics of the Yield-Await-Promise model. We yield a visual element that prompts the user to do
something, then wait for him to do so. It's that simple. The model is reminiscent of the sort of simply text
programs that you might have written in your first-year CS class. Instead of a simple text prompt sent to the
terminal, here we're outputting an HTML component, through React, to the web browser.

When you click the button on the page, `route.screen` is set to "alfa". This changes the location from
"http://localhost:3000/" to "http://localhost:3000/alfa", which sends us into the next clause:

```js
      } else if (route.screen === 'alfa') {
        const { ScreenAlfa } = await import('./screens/ScreenAlfa.js');
        yield to(<ScreenAlfa onNext={on.bravo} />);
        await eventual.bravo;
        route.screen = 'bravo';
      } else ...
```

The code is essentially identical to what's above. A transition will actually happen this time.

If you hit the browser's back button, `await eventual.bravo` will throw with a `RouteChangePending` error. This lands
in the catch block and eventually in `handleError`, which tells the router to proceed with the change. `route.screen`
becomes `undefined` again and matches the first `if` clause.

If you click the button on the page instead, we go to the next clause:

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

This screen has two buttons. We have to await two possible promises: `charlie` or `delta`. The promise fulfillment
value will be either `{ charlie: ... }` or `{ delta: ... }`. If it's the former, then we go to the Charlie section:

```js
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          state.count ??= 1;
          yield to(<ScreenCharlie count={state.count++} onNext={on.delta} />);
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            continue;
          } else {
            throw err;
          }
        }
      } else ...
```

There's a try-catch block in this clause, as [`ScreenCharlie`](./src/ScreenCharlie.js) will throw when the
number give to it is divisible by three:

```js
export function ScreenCharlie({ count, onNext }) {
  if (count % 3 === 0) {
    throw new ThirdTimeNotTheCharm(`Thou shalst not count to ${count}`);
  }
```

When that happens, we simply continue on, since the count has already been incremented and it'll be safe to
render the component again.

The `if` clause for [`ScreenDelta`](./src/ScreenDelta.js) also has a try-catch block:

```js
      } else if (route.screen === 'delta') {
        const { ScreenDelta } = await import('./screens/ScreenDelta.js');
        try {
          state.text ??= '';
          yield to(<ScreenDelta text={state.text} onText={t => state.text = t} onNext={on.echo} />);
          await eventual.echo;
          route.screen = 'echo';
        } catch (err) {
          if (err instanceof RouteChangePending && state.text.trim().length > 0) {
            yield to(<ScreenDelta text={state.text} onDetour={on.proceed} />);
            const { proceed } = await eventual.proceed;
            if (proceed) {
              throw err;
            } else {
              err.prevent();
            }
          } else {
            throw err;
          }
        }
      } else ...
```

This time we're catching the `RouteChangePending` error. When that happens, we ask `ScreenDelta` to put up a
dialog box by giving it a `onDetour` handler. We expect it to be called with either `true` or `false`. In the
first case, we rethrow the error so the default error handler will approve the detour. Otherwise the detour gets
prevented and we land back in `ScreenDelta`.

The next section, Echo, loads and calls a function:

```js
      } else if (route.screen === 'echo') {
        const { echo } = await import('./echo.js');
        state.echo ??= {};
        yield echo(state.echo, methods);
        route.screen = 'foxtrot';
      } else ...
```

Like `main`, `echo` is an async generator function. Execution of `main` will pause until all items have been retrieved
from the new generator.

The final section just send us back to section Alfa:

```js
      } else if (route.screen === 'foxtrot') {
        const { ScreenFoxtrot } = await import('./screens/ScreenFoxtrot.js');
        yield to(<ScreenFoxtrot onNext={on.alfa} />);
        await eventual.alfa;
        route.screen = 'alfa';
      } else ...
```

If nothing matches, a 404 error is thrown:

```js
      } else {
        throw404();
      }
```

## The echo function

`echo` has the same structure as `main`:

```js
export async function* echo(state, methods) {
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

The only difference is that this function returns and it does not handle errors. Any error would pop through and
land in the catch block of `main`.

## Error handling

Let us return to section "Charlie" and consider how an error emitted by `ScreenCharlie` would land in that
section's catch block. Here's the code once again:

```js
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          state.count ??= 1;
          yield to(<ScreenCharlie count={state.count++} onNext={on.delta} />);
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            continue;
          } else {
            throw err;
          }
        }
      } else ...
```

`ScreenCharlie` isn't actually called in the try block, either directly or indirectly. How does
an error emitted by the function get there then?

`ScreenCharlie` is passed to React, which calls it when it renders the component. React will catch any error thrown
and search for the nearest error boundary moving up the component tree. Now as you may recall, our router
provides one in [App](./src/App.js#50):

```js
  return createContext(createBoundary(<Frame ready={ready}>{element}</Frame>));
}
```

This boundary hands the error to the router, which in turns gives it to the [trap function we provided]
(./src/App.js#18)):

```js
      trap('error', (err) => {
        reject(err);
        return false;
      });
```

`reject` causes the current await operation to throw with the error. What and where is this operation? Well,
React would encounter the error as soon as its tries to render `ScreenCharlie` with a count divisible by three.
This happens in [Crossfade.js](./src/Crossfade.js#L22):

```js
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out">{previous}</div>
          <div key={currentKey} className="in">{element}</div>        // <--- ScreenCharlie
        </div>
      );
```

The await statement immediately below is where the error gets rethrown:

```js
      await eventual.transitionReady.for(25).milliseconds;
```

Since `Crossfade.to` doesn't use a try-catch block, the error will pop through (and shuts down) the generator.
React-seq will catch this error and redirect it to the parent generator using
[AsyncGenerator.throw](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator/throw),
which does the following (from Mozilla):

> The throw() method of an async generator acts as if a throw statement is inserted in the generator's body at
> the current suspended position, which informs the generator of an error condition and allows it to handle the
> error, or perform cleanup and close itself.

`main`'s "current suspended position" at this point would be between [the following two lines](./src/main.js#L33):

```js
          yield to(<ScreenCharlie count={state.count++} onNext={on.delta} />);
          await eventual.delta;
```

And that's how the error magically ends up inside the try block.

Whowee! That error went on one heck of a trip, that's for sure! You don't need to fully understand how this all works.
Just remember that there's a mechanism in place that allows you to handle errors where doing so makes intuitive
sense.

Before we leave the topic of error handling, let us consider the scenario where we aren't doing page transition.
Our "Charlie" section would look like this:

```js
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          yield <ScreenCharlie count={state.count++} onNext={on.delta} />;
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            continue;
          } else {
            throw err;
          }
        }
      } else ...
```

The code is identical except there's no `to(...)` after `yield`. What happens in this case? Exactly the same outcome,
with error thrown by `await eventual.delta` instead.

## Final thoughts

Thank you for reading! I hope the code was largely self-explanatory. It should be since it's all standard JavaScript:
a lot of ifs, yields, and awaits. One of the main goals of React-seq is to let programmers leverage language
features more effectively, features related to the async model in particular.

As said elsewhere, async generators aren't just dynamically generated arrays. You should think of them as timelines,
sequences of events. In this example, the sequences are fairly simple: just transitions from page to page.
Potentially much more complex sequences can be constructed, complete with server and user interactions. And thanks to
Rect-seq ability to handle nested generators, they would only be a yield and a function call away. I will explore the
topic further in the future as ideas come to me. If you have some ideas of your own, please feel free to share it
in the [dicussion board](https://github.com/chung-leong/react-seq/discussions).
