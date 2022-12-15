import { useSWAPI } from './swapi-ups.js';
import List from './List.js';

export default function FilmList() {
  const [ state ] = useSWAPI('films', {}, { refresh: 1 });
  const { films } = state;
  return (
    <div>
      <h1>Films</h1>
      <List items={films} field="title"/>
    </div>
  );
}
