import { useProgressive } from 'react-seq';
import { fetchOne, fetchMultiple } from './swapi.js';
import List from './List.js';

export default function Species({ id }) {
  return useProgressive(SpeciesUI, async ({ defer, suspend, signal }) => {
    defer(100);
    suspend(`species-${id}`);
    const species = await fetchOne(`species/${id}`, { signal });
    return {
      species,
      films: fetchMultiple(species.films, { signal }),
      people: fetchMultiple(species.people, { signal }),
      homeworld: fetchOne(species.homeworld, { signal }),
    };
  }, [ id ]);
}

function SpeciesUI({ species, films = [], people = [], homeworld = null }) {
  return (
    <div>
      <h1>{species.name}</h1>
      <div>Classification: {species.classification}</div>
      <div>Designation: {species.designation}</div>
      <div>Average height: {species.average_height}</div>
      <div>Skin colors: {species.skin_colors}</div>
      <div>Hair colors: {species.hair_colors}</div>
      <div>Eye colors: {species.eye_colors}</div>
      <div>Average lifespan: {species.average_lifespan}</div>
      <div>Language: {species.language}</div>
      <h2>Homeworld</h2>
      <List urls={species.homeworld} items={homeworld}/>
      <h2>Members</h2>
      <List urls={species.people} items={people}/>
      <h2>Films</h2>
      <List urls={species.films} items={films} field="title"/>
    </div>
  );
}
