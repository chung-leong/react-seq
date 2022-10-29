import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function Character({ id }) {
  const [ state ] = useSWAPI('people', { id }, { refresh: 300000 });
  const { person, homeworld, films, species, vehicles, starships } = state;
  if (!person) {
    return;
  }
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
