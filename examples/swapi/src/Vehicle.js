import { useProgressive } from 'react-seq';
import { fetchOne, fetchMultiple } from './swapi.js';
import List from './List.js';

export default function Vehicle({ id }) {
  return useProgressive(VehicleUI, async ({ defer, suspend, signal }) => {
    defer(100);
    suspend(`vehicles-${id}`);
    const vehicle = await fetchOne(`vehicles/${id}`, { signal });
    return {
      vehicle,
      films: fetchMultiple(vehicle.films, { signal }),
      pilots: fetchMultiple(vehicle.pilots, { signal }),
    };
  }, [ id ]);
}

function VehicleUI({ vehicle, films = [], pilots = [] }) {
  return (
    <div>
      <h1>{vehicle.name}</h1>
      <div>Model: {vehicle.model}</div>
      <div>Manufacturer: {vehicle.manufacturer}</div>
      <div>Cost in credits: {vehicle.cost_in_credits}</div>
      <div>Length: {vehicle.length} m</div>
      <div>Max atmosphering speed: {vehicle.max_atmosphering_speed} km/h</div>
      <div>Crew: {vehicle.crew}</div>
      <div>Passengers: {vehicle.passenger}</div>
      <div>Cargo capacity: {vehicle.cargo_capacity} kg</div>
      <div>Consumables: {vehicle.consumables}</div>
      <div>Vehicle class: {vehicle.vehicle_class}</div>
      <h2>Pilots</h2>
      <List urls={vehicle.pilots} items={pilots}/>
      <h2>Films</h2>
      <List urls={vehicle.films} items={films} field="title"/>
    </div>
  );
}
