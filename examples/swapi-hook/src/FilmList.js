import { useSWAPI } from './swapi-ups.js';
import List from './List.js';

export default function FilmList() {
  const [ { films } ] = useSWAPI('films');
  return (
    <div>
      <h1>Films</h1>
      <List items={films} field="title"/>
    </div>
  );
}
