import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function StarshipList() {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(StarshipListUI);
    defer(200);
    usable(10);
    suspend(`starship-list`);
    return { starships: fetchList('starships/', { signal }) };
  }, []);
}

function StarshipListUI({ starships }) {
  return (
    <div>
      <h1>Starships</h1>
      <List items={starships}/>
    </div>
  );
}
