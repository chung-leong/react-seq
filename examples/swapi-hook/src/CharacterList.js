import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function CharacterList() {
  const [ { people } ] = useSWAPI('people', {}, { refresh: 1 });
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
