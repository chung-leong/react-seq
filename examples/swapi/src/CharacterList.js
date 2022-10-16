import React from 'react';
import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function CharacterList() {
  return useProgressive(CharacterListUI, async ({ defer, usable, suspend }) => {
    defer(100);
    usable({ people: 30 });
    suspend(`character-list`);

    return { people: fetchList('people/') };
  }, []);
}

function CharacterListUI({ people }) {
  return (
    <div>
      <h1>Characters</h1>
      <List items={people} />
    </div>
  );
}
