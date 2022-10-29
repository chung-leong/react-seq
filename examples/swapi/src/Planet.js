import { useProgressive } from 'react-seq';
import { fetchOne, fetchMultiple } from './swapi.js';
import List from './List.js';

export default function Planet({ id }) {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(PlanetUI);
    defer(200);
    usable(0);
    suspend(`planet-${id}`);
    const planet = await fetchOne(`planets/${id}`, { signal });
    return {
      planet,
      films: fetchMultiple(planet.films, { signal }),
      residents: fetchMultiple(planet.residents, { signal }),
    };
  }, [ id ]);
}

function PlanetUI({ planet, films, residents }) {
  return (
    <div>
      <h1>{planet.name}</h1>
      <div>Diameter: {planet.diameter} km</div>
      <div>Rotation period: {planet.rotation_period} hr</div>
      <div>Orbital period: {planet.orbital_period} days</div>
      <div>Climate: {planet.climate}</div>
      <div>Gravity: {planet.gravity}</div>
      <div>Terrain: {planet.terrain}</div>
      <div>Surface water: {planet.surface_water}</div>
      <div>Population: {planet.population}</div>
      <h2>Residents</h2>
      <List urls={planet.residents} items={residents}/>
      <h2>Films</h2>
      <List urls={planet.films} items={films} field="title"/>
    </div>
  );
}
