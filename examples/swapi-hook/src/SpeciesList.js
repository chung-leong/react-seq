import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function SpeciesList() {
  const [ { species } ] = useSWAPI('species', {}, { refresh: 1 });
  return (
    <div>
      <h1>Species</h1>
      <List items={species}/>
    </div>
  );
}
