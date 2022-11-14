import { useSWAPI } from './swapi.js';
import List from './List.js';

export default function FilmList() {
  const [ { films } ] = useSWAPI('films', {}, { refresh: 1 });
  return (
    <div>
      <h1>Films</h1>
      <List items={films} field="title"/>
    </div>
  );
}
