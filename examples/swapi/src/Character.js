import { useProgressive } from 'react-seq';
import { fetchOne, fetchMultiple } from './swapi.js';
import List from './List.js';

export default function Character({ id }) {
  return useProgressive(async ({ type, defer, suspend, signal }) => {
    type(CharacterUI);
    defer(200);
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
