import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function StarshipList() {
  const [ state ] = useSWAPI('starships', {}, { refresh: 1 });
  const { starships } = state;
  return (
    <div>
      <h1>Starships</h1>
      <List items={starships}/>
    </div>
  );
}
