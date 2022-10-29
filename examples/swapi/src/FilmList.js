import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function FilmList() {
  return useProgressive(async ({ type, defer, usable, suspend, signal }) => {
    type(FilmListUI);
    defer(200);
    usable(10);
    suspend(`film-list`);
    return { films: fetchList('films/', { signal }) };
  }, []);
}

function FilmListUI({ films }) {
  return (
    <div>
      <h1>Films</h1>
      <List items={films} field="title"/>
    </div>
  );
}
