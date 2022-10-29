import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function VehicleList() {
  return useProgressive(async ({ type, defer, usable, suspend }) => {
    type(VehicleListUI);
    defer(200);
    usable({ vehicles: 30 });
    suspend(`vehicle-list`);
    return { vehicles: fetchList('vehicles/') };
  }, []);
}

function VehicleListUI({ vehicles }) {
  return (
    <div>
      <h1>Vehicles</h1>
      <List items={vehicles}/>
    </div>
  );
}
