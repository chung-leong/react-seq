import React from 'react';
import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function PlanetList() {
  return useProgressive(PlanetListUI, async ({ defer, usable, suspend }) => {
    defer(100);
    usable({ planets: 20 });
    suspend(`planet-list`);
    return { planets: fetchList('planets/') };
  }, []);
}

function PlanetListUI({ planets }) {
  return (
    <div>
      <h1>Planets</h1>
      <List items={planets} />
    </div>
  );
}
