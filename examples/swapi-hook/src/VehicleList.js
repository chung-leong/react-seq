import { useSWAPI } from './swapi.js';
import List from './List.js';

function VehicleListUI({ vehicles }) {
  const [ { vehicles } ] = useSWAPI('vehicles', {}, { refresh: 300000 });
  return (
    <div>
      <h1>Vehicles</h1>
      <List items={vehicles}/>
    </div>
  );
}
