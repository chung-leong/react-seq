import { useSWAPI } from './swapi.js';
import List from './List.js';

function StarshipListUI({ films }) {
  const [ { starships } ] = useSWAPI('starships', {}, { refresh: 300000 });
  return (
    <div>
      <h1>Starships</h1>
      <List items={films}/>
    </div>
  );
}
