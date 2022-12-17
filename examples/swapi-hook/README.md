# Star Wars API example

React-seq provides four hooks. Each of these is designed for particular usage scenarios. In this example, we're
going to reimplement the previous [Star Wars API example](../swapi/README.md) the two state hooks:
[useSequentialState](../../doc/useSequentialState.md) and [useProgressiveState](../../doc/useProgressiveState.md).
Neither is the optimal tool for the task. We're going to discuss what the shortcomings are.

State hooks have the advantage of requiring less "buy-in". They're just hook functions that return data. You can use
them whenever you need results from some asynchronous operation. When you're creating custom hooks, one of the two
will probably be what you need.

## Seeing the code in action

Go to the `examples/swapi-hook` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

## Character list component

The [character list component](./src/CharacterList.js) is quite simple:

```js
export default function CharacterList() {
  const [ state ] = useSWAPI('people', {}, { refresh: 1 });
  const { people } = state;
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
```

It uses the custom hook [useSWAPI](./src/swapi-uss.js) to obtain a list of characters, requesting that a refresh
should happen every minute (a short time for demo purpose).

Note that the component is unaware that React-seq is being used, unlike
[the component in the original example](../swapi/src/CharacterList.js), which was fully designed around the library.

## Character component

The [character component](./src/CharacterList.js) is also trivial:

```js
export default function Character({ id }) {
  const [ state ] = useSWAPI('people', { id }, { refresh: 1 });
  const { person, homeworld, films, species, vehicles, starships } = state;
  return (
    <div>
      <h1>{person?.name}</h1>
      <div>Height: {person?.height} cm</div>
      <div>Mass: {person?.mass} kg</div>
      <div>Hair color: {person?.hair_color}</div>
      <div>Skin color: {person?.skin_color}</div>
      <div>Hair color: {person?.hair_color}</div>
      <div>Eye color: {person?.eye_color}</div>
      <div>Birth year: {person?.birth_year}</div>
      <h2>Homeworld</h2>
      <List urls={person?.homeworld} items={homeworld} />
      <h2>Films</h2>
      <List urls={person?.films} items={films} field="title" />
      <h2>Species</h2>
      <List urls={person?.species} items={species} />
      <h2>Vehicles</h2>
      <List urls={person?.vehicles} items={vehicles} />
      <h2>Starships</h2>
      <List urls={person?.starships} items={starships} />
    </div>
  );
}
```

It uses the same hook to obtain information about the character in question. Initially, `state` will be an
empty object. We use the `?.` optional chaining operator to deal with that fact.

Note again that the component is unaware React-seq is being used. From its point of view, it's just getting
an object from a React hook. In this example, all data retrieval functionality is isolated in the useSWAPI hook. Let us examine what it does.

## The hook

Here's the [opening section of the hook](./src/swapi-uss.js#L6):

```js
export function useSWAPI(type, params = {}, options = {}) {
  const {
    delay = 100,
    refresh = 24 * 60,
  } = options;
  const { id } = params;
  const onRef = useRef();
  const state = useSequentialState(async function*({ initial, defer, manageEvents, signal }) {
    initial({});
    const [ on, eventual ] = manageEvents();
    onRef.current = on;
```

We use [`initial`](../../doc/initial.md) to set the hook's initial state to an empty object.

We use a `useRef` hook to create a state variable for holding a copy of `on` from
[`manageEvents`](../../doc/manageEvents.md). We need to do this because the hook is going to return a handler:

```js
  return [ state, onRef.current.updateRequest ];
}
```

The hook consumer will receive a function that triggers a refresh of the data manually.

The use of `useRef` is necessary, since the callback given to `useSequentialState` doesn't always run. It does
so only when there are changes to the hook's dependencies. If we naively had written the following instead:

```js
  let updateRequest;
  const state = useSequentialState(async function*({ initial, defer, manageEvents, signal }) {
    initial({});
    const [ on, eventual ] = manageEvents();
    updateRequest = on.updateRequest;
    /* ... */
  }
  return [ state, onUpdateRequest ];
```

ESLint would gives us a helpful warning:

> Assignments to the 'onUpdateRequest' variable from inside React Hook useSequentialState will be lost after
> each render. To preserve the value over time, store it in a useRef Hook and keep the mutable value in the
> '.current' property. Otherwise, you can move this variable directly inside useSequentialState
> `react-hooks/exhaustive-deps`

To configure ESLint to recognize React-seq's hooks, add "react-seq" to the "eslintConfig"
section in [package.json](./package.json):

```json
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest",
      "react-seq"
    ]
  },
```

Okay, moving on. `useSWAPI` runs a infinite loop:

```js
    for (let i = 0;; i++) {
      defer(i === 0 ? delay : Infinity);
      try {
        const opts = { signal };
        switch (type) {
          case 'people':
            if (id) {
              const person = await fetchOne(`people/${id}`, opts);
              yield { person };
              const films = await fetchMultiple(person.films, opts);
              yield { person, films };
              const species = await fetchMultiple(person.species, opts);
              yield { person, films, species };
              const homeworld = await fetchOne(person.homeworld, opts);
              yield { person, films, species, homeworld };
              const vehicles = await fetchMultiple(person.vehicles, opts);
              yield { person, films, species, homeworld, vehicles };
              const starships = await fetchMultiple(person.starships, opts);
              yield { person, films, species, homeworld, vehicles, starships };
            } else {
              const people = await fetchList('people/', opts);
              yield { people };
            }
            break;
          // ...other cases...
```

In the first iteration, we use the deferment delay specified by `options` (100ms by default). Subsequently we
use `Infinity` so that intermediate states get ignored. We want to display incomplete data set when the page
loads, not when it refreshes.

Assuming a slow connection, the hook consumer will first get `person`. Then it gets `films` as well. Then
`species` and so forth. More and more information becomes available as it's fetched from the server.

If an error occurs (no Internet access for instance), we choose to ignore it if we're only trying to
update the page:

```js
        } // end of switch
      } catch (err) {
        if (i === 0) {
          throw err;
        }
```        

In the `finally` block, we wait for an update request (triggered by the function returned to the hook
consumer) or until the refresh time is reached:

```js
      } finally {
        await eventual.updateRequest.for(refresh).minutes;
        console.log(`refreshing (${i + 1})...`)
      }
```  

You can verify that the does refresh itself by opening the development console.

## Downsides of using state hooks

As said at the beginning, the state hooks require less of a buy-in. The element returning hooks
([useSequential](../../useSequential.md) and [useProgressive](../../useProgressive.md)), by their nature, are
closer to the presentation layer. More of your code needs to conform to React-seq's way of doing things. The use
of React-seq state hooks can be easily isolated to a single file, as we've done so in this example. If sudden you
decide that this library stinks, you could remove the dependency without much effort.

What are the downsides then? The state hooks are not integrated into React's
[suspension scheme](https://reactjs.org/docs/react-api.html#reactsuspense). That means the component wouldn't
trigger the display of a fallback when it's in a busy state. The `<Suspense>...</Suspese>` in [`App`](./src/App.js)
only handles the lazy loading of the components, not data retrieval.

The lack of suspension also means the component cannot be fully rendered on the server side. Only its initial state
will get rendered.

Page transition is also poorer, since React cannot wait just a little bit for the component to get into its ready
state.

Clicking around in the example app, you'll notice the experience does not feel as smooth as the original example.
A large part of that is due to the way we have implemented our hook. It doesn't yield data in a terribly progressive
fashion. The hook would wait for a dozen HTTP requests and return the results all at once.

If you go to the **Films** page, you'll notice that it shows things more progressively. This is because that page
uses an alternate implementation that uses [`useProgressiveState`](../../doc/useProgressiveState.md).

## Using useProgressive

Here's the abbreviated code for [the alternate implementation](./src/swapi-usp.js):

```js
export function useSWAPI(type, params = {}, options = {}) {
  const {
    delay = 100,
  } = options;
  const { id } = params;
  const state = useProgressiveState(async ({ defer, signal }) => {
    defer(delay);
    const opts = { signal };
    switch (type) {
      // ...other cases...
      case 'films':
        if (id) {
          const film = await fetchOne(`films/${id}`, opts);
          return {
            film,
            characters: fetchMultiple(film.characters, opts),
            species: fetchMultiple(film.species, opts),
            planets: fetchMultiple(film.planets, opts),
            vehicles: fetchMultiple(film.vehicles, opts),
            starships: fetchMultiple(film.starships, opts),
          };
        } else {
          return { films: fetchList('films/', opts) };
        }
      // ...other cases...
    }
  }, [ delay, id, type ]);
  return [ state ];
}
```

Note the hook's return statement: Only the state is returned here. No update function is returned.
`useProgressiveState` is simply not designed for that. It's designed for loading data only once.

A [third implementation](./src/swapi-uss-gp.js) is available that gives you both improved progressive
display and the ability to refresh the data. Just change the import statement to `'./swapi-uss-gp.js'`. This
hook is basically a combination of the other two. I'll leave it up to you to figure out how it works :-)

## Final thoughts
