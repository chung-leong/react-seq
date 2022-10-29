import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function CharacterListUI({ people }) {
  const [ { people } ] = useSWAPI('people', {}, { refresh: 300000 });
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
