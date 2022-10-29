import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function Planet({ id }) {
  const [ state ] = useSWAPI('planets', { id }, { refresh: 300000 });
  const { planet, films, residents } = state;
  return (
    <div>
      <h1>{planet?.name}</h1>
      <div>Diameter: {planet?.diameter} km</div>
      <div>Rotation period: {planet?.rotation_period} hr</div>
      <div>Orbital period: {planet?.orbital_period} days</div>
      <div>Climate: {planet?.climate}</div>
      <div>Gravity: {planet?.gravity}</div>
      <div>Terrain: {planet?.terrain}</div>
      <div>Surface water: {planet?.surface_water}</div>
      <div>Population: {planet?.population}</div>
      <h2>Residents</h2>
      <List urls={planet?.residents} items={residents}/>
      <h2>Films</h2>
      <List urls={planet?.films} items={films} field="title"/>
    </div>
  );
}
