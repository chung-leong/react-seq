import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function SpeciesListUI() {
  const [ { species } ] = useSWAPI('species', {}, { refresh: 300000 });
  return (
    <div>
      <h1>Species</h1>
      <List items={species}/>
    </div>
  );
}
