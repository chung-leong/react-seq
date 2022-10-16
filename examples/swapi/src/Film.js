import { useProgressive } from 'react-seq';
import { fetchOne, fetchMultiple } from './swapi.js';
import List from './List.js';

export default function Film({ id }) {
  return useProgressive(FilmUI, async ({ defer, suspend, signal }) => {
    defer(100);
    suspend(`film-${id}`);
    const film = await fetchOne(`films/${id}`, { signal });
    return {
      film,
      characters: fetchMultiple(film.characters, { signal }),
      species: fetchMultiple(film.species, { signal }),
      planets: fetchMultiple(film.planets, { signal }),
      vehicles: fetchMultiple(film.vehicles, { signal }),
      starships: fetchMultiple(film.starships, { signal }),
    };
  }, [ id ]);
}

function FilmUI({ film, characters = [], species = [], planets = [], vehicles = [], starships = [] }) {
  return (
    <div>
      <h1>{film.title}</h1>
      <p>{film.opening_crawl}</p>
      <div>Director: {film.director}</div>
      <div>Producer: {film.producer}</div>
      <div>Release date: {film.release_date}</div>
      <h2>Characters</h2>
      <List urls={film.characters} items={characters} />
      <h2>Species</h2>
      <List urls={film.species} items={species} />
      <h2>Planets</h2>
      <List urls={film.planets} items={planets} />
      <h2>Vehicles</h2>
      <List urls={film.vehicles} items={vehicles} />
      <h2>Starships</h2>
      <List urls={film.starships} items={starships} />
    </div>
  );
}
