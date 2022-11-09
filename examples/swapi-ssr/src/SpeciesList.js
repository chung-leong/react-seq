import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function SpeciesList() {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(SpeciesListUI);
    defer(200);
    usable(10);
    suspend(`species-list`);
    return { species: fetchList('species/', { signal }) };
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
