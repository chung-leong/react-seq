import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function FilmList() {
  return useProgressive(async ({ type, defer, usable, suspend }) => {
    type(FilmListUI);
    defer(200);
    usable({ films: 20 });
    suspend(`film-list`);
    return { films: fetchList('films/') };
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
