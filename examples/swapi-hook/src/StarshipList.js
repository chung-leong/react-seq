import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function StarshipList() {
  const [ { starships } ] = useSWAPI('starships', {}, { refresh: 1 });
  return (
    <div>
      <h1>Starships</h1>
      <List items={starships}/>
    </div>
  );
}
