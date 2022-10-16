import React from 'react';
import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function VehicleList() {
  return useProgressive(VehicleListUI, async ({ defer, usable, suspend }) => {
    defer(100);
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
