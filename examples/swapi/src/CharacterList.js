import React from 'react';
import { useProgressive } from 'react-seq';
import { fetchList } from './swapi.js';
import List from './List.js';

export default function CharacterList() {
  return useProgressive(async ({ type, defer, usable, suspend }) => {
    type(CharacterListUI);
    defer(100);
    usable({ people: 20 });
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
