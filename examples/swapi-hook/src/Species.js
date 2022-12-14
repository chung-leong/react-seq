import { useSWAPI } from './swapi-uss.js';
import List from './List.js';

export default function Species({ id }) {
  const [ state ] = useSWAPI('species', { id }, { refresh: 1 });
  const { species, films, people, homeworld } = state;
  return (
    <div>
      <h1>{species?.name}</h1>
      <div>Classification: {species?.classification}</div>
      <div>Designation: {species?.designation}</div>
      <div>Average height: {species?.average_height}</div>
      <div>Skin colors: {species?.skin_colors}</div>
      <div>Hair colors: {species?.hair_colors}</div>
      <div>Eye colors: {species?.eye_colors}</div>
      <div>Average lifespan: {species?.average_lifespan}</div>
      <div>Language: {species?.language}</div>
      <h2>Homeworld</h2>
      <List urls={species?.homeworld} items={homeworld}/>
      <h2>Members</h2>
      <List urls={species?.people} items={people}/>
      <h2>Films</h2>
      <List urls={species?.films} items={films} field="title"/>
    </div>
  );
}
