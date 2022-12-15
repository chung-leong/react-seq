import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function PlanetList() {
  const [ state ] = useSWAPI('planets', {}, { refresh: 1 });
  const { planets } = state;
  return (
    <div>
      <h1>Planets</h1>
      <List items={planets} />
    </div>
  );
}
