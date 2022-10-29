import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function StarshipList() {
  return useProgressive(async ({ type, defer, usable, suspend }) => {
    type(StarshipListUI);
    defer(200);
    usable({ films: 20 });
    suspend(`starship-list`);
    return { films: fetchList('starships/') };
  }, []);
}

function StarshipListUI({ films }) {
  return (
    <div>
      <h1>Starships</h1>
      <List items={films}/>
    </div>
  );
}
