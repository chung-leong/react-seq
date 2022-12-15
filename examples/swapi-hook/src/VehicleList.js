import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function VehicleList() {
  const [ state ] = useSWAPI('vehicles', {}, { refresh: 1 });
  const { vehicles } = state;
  return (
    <div>
      <h1>Vehicles</h1>
      <List items={vehicles}/>
    </div>
  );
}
