import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function VehicleList() {
  const [ { vehicles } ] = useSWAPI('vehicles', {}, { refresh: 1 });
  return (
    <div>
      <h1>Vehicles</h1>
      <List items={vehicles}/>
    </div>
  );
}
