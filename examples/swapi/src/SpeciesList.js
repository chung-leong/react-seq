import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function SpeciesList() {
  return useProgressive(async ({ type, defer, usable, suspend }) => {
    type(SpeciesListUI);
    defer(200);
    usable({ species: 20 });
    suspend(`species-list`);
    return { species: fetchList('species/') };
  }, []);
}

function SpeciesListUI({ species }) {
  return (
    <div>
      <h1>Species</h1>
      <List items={species}/>
    </div>
  );
}
