# Star Wars API example

In this example, we're going to build a simple website that displays information about Star Wars. We're going to
be using [useProgressive](../../doc/useProgress.md), a specialized hook for feeding data into a component in
a piece-meal fashion. Given any number of async generators, it will translate them into progressively filled arrays.

## Seeing the code in action

Go to the `examples/swapi` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

![screenshot](./img/screenshot-1.jpg)

## The App component

The [example app](./src/App.js) handles routing using [array-router](https://github.com/chung-leong/array-router),
a very simple solution that gives us just an array of path parts. As you can see in the code below, the actual
routing is done using a switch statement:

```js
export default function App() {
  const provide = useRouter({ trailingSlash: true });
  return (
    <div className="App">
      <div>
        <NavBar />
        <div className="contents">
          <Suspense fallback={<Loading />}>
            {provide((parts, query, { throw404 }) => {
              try {
                const [ section, id ] = parts;
                switch (section) {
                  case undefined:
                    return <Welcome />;
                  case 'people':
                    return (id) ? <Character id={id} /> : <CharacterList />;
                  case 'films':
                    return (id) ? <Film id={id} /> : <FilmList />;
                  case 'planets':
                    return (id) ? <Planet id={id} /> : <PlanetList />;
                  case 'species':
                    return (id) ? <Species id={id} /> : <SpeciesList />;
                  case 'starships':
                    return (id) ? <Starship id={id} /> : <StarshipList />;
                  case 'vehicles':
                    return (id) ? <Vehicle id={id} /> : <VehicleList />;
                  default:
                    throw404();
                }
              } catch (err) {
                return <NotFound />;
              }
            })}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

Everything is wrapped in a [Suspense](https://reactjs.org/docs/react-api.html#suspense) element. It will deal with
suspension due to lazy loading of components as well as data retrieval.

## Character list

Let us now look at the [CharacterList component](./src/CharacterList.js):

```js
export default function CharacterList() {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(CharacterListUI);
    defer(200);
    usable(10);
    suspend(`character-list`);
    return { people: fetchList('people/', { signal }) };
  }, []);
}
```

All it does is call `useProgress`. The hook expects an async function as parameter. This function is responsible
for setting up the async generators. It is given a number of config functions. We use [`type`](../../doc/type.md) to
specify the data recipient. We use [`defer`](../../doc/defer.md) to tell the hook that we don't it to rerender as soon
as data becomes available but to check every 200ms instead. So if three HTTP requests are needed to complete the page
and all three complete in less than 200ms, only a single update would occur.

We call [`usable`](../../doc/usable.md) to specify that the data set is valid when there's at least 10 items in every
array. In this case, the criteria applies to `people`.

We call [`suspend`](../../doc/suspend.md) to indicate that we want `useProgressive` to omit the `Suspense` element that
it would normally wrap around the lazy component that it returns. `App` is already providing a `Suspense` with a
fallback so we don't want another one at this level. Because we're allowing a suspension to "pop through" this
component, `CharacterList`, we need to provide a unique key so that `useProgressive` can find the work it has
performed already when the component is recreated when suspension ends. Without this key `useProgressive` would
infinitely repeat itself, each time thinking it's the first time due to the loss of state.

The target component is very simple. It just produces a list of links using the component [List](./src/List.js):

```js
function CharacterListUI({ people }) {
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
```

As an alternative to defining a separate component, we could have use [`element`](../../doc/element.md) instead:

```js
export default function CharacterList() {
  return useProgressive(async ({ element, defer, usable, suspend, signal }) => {
    element(({ people }) => (
      <div>
        <h1>Characters</h1>
        <List items={people} />
      </div>
    ));
    defer(200);
    usable(10);
    suspend(`character-list`);
    return { people: fetchList('people/', { signal }) };
  }, []);
}
```



```js
export default function Character({ id }) {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(CharacterUI);
    defer(200);
    usable(0);
    suspend(`character-${id}`);
    const person = await fetchOne(`people/${id}`, { signal });
    return {
      person,
      films: fetchMultiple(person.films, { signal }),
      species: fetchMultiple(person.species, { signal }),
      homeworld: fetchOne(person.homeworld, { signal }),
      vehicles: fetchMultiple(person.vehicles, { signal }),
      starships: fetchMultiple(person.starships, { signal }),
    };
  }, [ id ]);
}

function CharacterUI({ person, homeworld, films, species, vehicles, starships }) {
  return (
    <div>
      <h1>{person.name}</h1>
      <div>Height: {person.height} cm</div>
      <div>Mass: {person.mass} kg</div>
      <div>Hair color: {person.hair_color}</div>
      <div>Skin color: {person.skin_color}</div>
      <div>Hair color: {person.hair_color}</div>
      <div>Eye color: {person.eye_color}</div>
      <div>Birth year: {person.birth_year}</div>
      <h2>Homeworld</h2>
      <List urls={person.homeworld} items={homeworld} />
      <h2>Films</h2>
      <List urls={person.films} items={films} field="title" />
      <h2>Species</h2>
      <List urls={person.species} items={species} />
      <h2>Vehicles</h2>
      <List urls={person.vehicles} items={vehicles} />
      <h2>Starships</h2>
      <List urls={person.starships} items={starships} />
    </div>
  );
}
```

```js
export async function fetchOne(url, options) {
  const absURL = (new URL(url, baseURL)).toString();
  return fetchJSON(absURL, options);
}

/*...*/

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (res.status !== 200) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}
```

```js
export function* fetchMultiple(urls, options) {
  for (const url of urls) {
    yield fetchOne(url, options);
  }
}
```

```js
export async function* fetchList(url, options) {
  let absURL = (new URL(url, baseURL)).toString();
  do {
    const { results, next } = await fetchJSON(absURL, options);
    yield results.values();
    absURL = next;
  } while (absURL);
}
```
