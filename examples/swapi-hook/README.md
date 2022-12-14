# Star Wars API example

React-seq provides four hooks. Each of these is designed for particular usage scenarios. In this example, we're
going to reimplement the previous [Star Wars API example](../swapi/README.md) using
[useSequentialState](../../doc/useSequentialState.md). It's not the optimal tool for the task. We're going to
discuss what the shortcomings are.


## Seeing the code in action

Go to the `examples/swapi-hook` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

## Character list component

```js
export default function CharacterList() {
  const [ { people } ] = useSWAPI('people', {}, { refresh: 1 });
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
```

## Character component

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

## The hook

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

```js
  return [ state, onRef.current.updateRequest ];
}
```

```json
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ],
    "rules": {
      "react-hooks/exhaustive-deps": [
        "warn",
        {
          "additionalHooks": "use(Progressive(State)?|Sequential(State)?)"
        }
      ]
    }
  },
```

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

```js
        } // end of switch
      } catch (err) {
        if (i === 0) {
          throw err;
        }
```        

```js
      } finally {
        await eventual.updateRequest.for(refresh).minutes;
        console.log(`refreshing (${i + 1})...`)
      }
```  


```js             
    } // end of try-catch-finally
  }, [ delay, id, refresh, type ]);
```
