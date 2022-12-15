import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function SpeciesList() {
  const [ state ] = useSWAPI('species', {}, { refresh: 1 });
  const { species } = state;
  return (
    <div>
      <h1>Species</h1>
      <List items={species}/>
    </div>
  );
}
