import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function Film({ id }) {
  const [ state ] = useSWAPI('films', { id }, { refresh: 300000 });
  const { film, characters, species, planets, vehicles, starships } = state;
  return (
    <div>
      <h1>{film?.title}</h1>
      <p>{film?.opening_crawl}</p>
      <div>Director: {film?.director}</div>
      <div>Producer: {film?.producer}</div>
      <div>Release date: {film?.release_date}</div>
      <h2>Characters</h2>
      <List urls={film?.characters} items={characters} />
      <h2>Species</h2>
      <List urls={film?.species} items={species} />
      <h2>Planets</h2>
      <List urls={film?.planets} items={planets} />
      <h2>Vehicles</h2>
      <List urls={film?.vehicles} items={vehicles} />
      <h2>Starships</h2>
      <List urls={film?.starships} items={starships} />
    </div>
  );
}
