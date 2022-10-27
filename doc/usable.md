# usable(arg)

Control whether content update occur when the data set is incomplete

## Providers

* [useProgressive](useProgressive.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function StarWarsCharacter({ id }) {
  return useProgressive(async ({ fallback, type, usable }) => {
    fallback(<Spinner />);
    type(StarWarsCharacterUI);
    usable(0);
    const person = await fetchOne(`people/${id}`);
    return {
      person,
      films: fetchMultiple(person.films),
      species: fetchMultiple(person.species),
      homeworld: fetchOne(person.homeworld),
      vehicles: fetchMultiple(person.vehicles),
      starships: fetchMultiple(person.starships),
    };
  }, [ id ]);
}
```

## Parameters

* `arg` - `<number>` or `<function>` or `<Object>` When the argument is a `<number>`, it indicates the
minimum number of items an array needs to have. When it is a `<function>`, it is called with the array as parameter
to determine whether the prop is usable at the given moment. When it is an `<Object>`, it's expected to contain
the usability criteria for each individual property.

## Usability Explained

By default, `useProgressive` would wait until all properties have been fully resolved before rendering a component (
or returning the state in case of [useProgressiveState](./useProgressiveState.md)). This behavior is obviously
not very progressive. An end-user would end up staring at a spinner for a long time.

`usable` lets you tell the hook that it's okay to render with an incomplete data set, that the target component
is capable of handling missing data.

## Notes

You can call `usable` multiple times. For instance, you can set a default to all props then specify a tighter
restriction on one prop:

```js
usable(0);
usable({ films: 7, homeworld: 1 })
```

In addition to the property in question, usability functions are called with a second parameter: `props`. It contains
the current states of all properties. You can potentially use it to determine whether the prop in question is usable
based on the length of another prop.

For clarity, [`signal`](./signal.md) is omitted from the calls to fetch functions above. It would be passed in
real-world scenario to cancel pending fetch requests no longer needed (due to the user switching to a different
page, for instance).

## Examples

* [SWAPI Example](../examples/swapi/README.md)
