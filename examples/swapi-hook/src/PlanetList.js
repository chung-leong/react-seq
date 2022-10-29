import { useSWAPI } from './swapi.js';
import List from './List.js';

function PlanetListUI({ planets }) {
  const [ { planets } ] = useSWAPI('planets', {}, { refresh: 300000 });
  return (
    <div>
      <h1>Planets</h1>
      <List items={planets} />
    </div>
  );
}
