import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function CharacterList() {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(CharacterListUI);
    defer(200);
    usable(10);
    suspend(`character-list`);
    return { people: fetchList('people/', { signal }) };
  }, []);
}

function CharacterListUI({ people }) {
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
