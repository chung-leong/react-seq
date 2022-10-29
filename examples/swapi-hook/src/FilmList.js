import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function FilmListUI() {
  const [ { films } ] = useSWAPI('films', {}, { refresh: 300000 });
  return (
    <div>
      <h1>Films</h1>
      <List items={films} field="title"/>
    </div>
  );
}
