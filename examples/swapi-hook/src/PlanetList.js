import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function PlanetList() {
  const [ { planets } ] = useSWAPI('planets', {}, { refresh: 1 });
  return (
    <div>
      <h1>Planets</h1>
      <List items={planets} />
    </div>
  );
}
