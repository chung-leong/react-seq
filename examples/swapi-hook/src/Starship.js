import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function Starship({ id }) {
  const [ state ] = useSWAPI('starships', { id }, { refresh: 1 });
  const { starship, films, pilots } = state;
  return (
    <div>
      <h1>{starship?.name}</h1>
      <div>Model: {starship?.model}</div>
      <div>Manufacturer: {starship?.manufacturer}</div>
      <div>Cost in credits: {starship?.cost_in_credits}</div>
      <div>Length: {starship?.length} m</div>
      <div>Max atmosphering speed: {starship?.max_atmosphering_speed} km/h</div>
      <div>Max sublight speed: {starship?.MGLT} MGLT</div>
      <div>Hyperdrive rating: {starship?.hyperdrive_rating}</div>
      <div>Crew: {starship?.crew}</div>
      <div>Passengers: {starship?.passenger}</div>
      <div>Cargo capacity: {starship?.cargo_capacity} kg</div>
      <div>Consumables: {starship?.consumables}</div>
      <div>Starship class: {starship?.starship_class}</div>
      <h2>Pilots</h2>
      <List urls={starship?.pilots} items={pilots}/>
      <h2>Films</h2>
      <List urls={starship?.films} items={films} field="title"/>
    </div>
  );
}
