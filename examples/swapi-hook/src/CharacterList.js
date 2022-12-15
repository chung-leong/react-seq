import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function CharacterList() {
  const [ state ] = useSWAPI('people', {}, { refresh: 1 });
  const { people } = state;
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
