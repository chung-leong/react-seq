import { useRef } from 'react';
import { useSequentialState } from 'react-seq';

const baseURL = 'https://swapi.dev/api/';

export function useSWAPI(type, params = {}, options = {}) {
  const {
    delay = 100,
    refresh = 24 * 60,
  } = options;
  const { id } = params;
  const onRef = useRef();
  const state = useSequentialState(async function*({ initial, defer, manageEvents, signal }) {
    initial({});
    const [ on, eventual ] = manageEvents();
    onRef.current = on;
    for (let i = 0;; i++) {
      defer(i === 0 ? delay : Infinity);
      try {
        const opts = { signal };
        switch (type) {
          case 'people':
            if (id) {
              const person = await fetchOne(`people/${id}`, opts);
              yield { person };
              const films = await fetchMultiple(person.films, opts);
              yield { person, films };
              const species = await fetchMultiple(person.species, opts);
              yield { person, films, species };
              const homeworld = await fetchOne(person.homeworld, opts);
              yield { person, films, species, homeworld };
              const vehicles = await fetchMultiple(person.vehicles, opts);
              yield { person, films, species, homeworld, vehicles };
              const starships = await fetchMultiple(person.starships, opts);
              yield { person, films, species, homeworld, vehicles, starships };
            } else {
              const people = await fetchList('people/', opts);
              yield { people };
            }
            break;
          case 'films':
            if (id) {
              const film = await fetchOne(`films/${id}`, opts);
              yield { film };
              const characters = await fetchMultiple(film.characters, opts);
              yield { film, characters };
              const species = await fetchMultiple(film.species, opts);
              yield { film, characters, species };
              const planets = await fetchMultiple(film.planets, opts);
              yield { film, characters, species, planets };
              const vehicles = await fetchMultiple(film.vehicles, opts);
              yield { film, characters, species, planets, vehicles };
              const starships = await fetchMultiple(film.starships, opts);
              yield { film, characters, species, planets, vehicles, starships };
            } else {
              const films = await fetchList('films/', opts);
              yield { films };
            }
            break;
          case 'planets':
            if (id) {
              const planet = await fetchOne(`planets/${id}`, opts);
              yield { planet };
              const films = await fetchMultiple(planet.films, opts);
              yield { planet, films };
              const residents = await fetchMultiple(planet.residents, opts);
              yield { planet, films, residents };
            } else {
              const planets = await fetchList('planets/', opts);
              yield { planets }
            }
            break;
          case 'species':
            if (id) {
              const species = await fetchOne(`species/${id}`, opts);
              yield { species };
              const films = await fetchMultiple(species.films, opts);
              yield { species, films };
              const people = await fetchMultiple(species.people, opts);
              yield { species, films, people };
              const homeworld = await fetchOne(species.homeworld, opts);
              yield { species, films, people, homeworld };
            } else {
              const species = await fetchList('species/', opts);
              yield { species };
            }
            break;
          case 'starships':
            if (id) {
              const starship = await fetchOne(`starships/${id}`, opts);
              yield { starship };
              const films = await fetchMultiple(starship.films, opts);
              yield { starship, films };
              const pilots = await fetchMultiple(starship.pilots, opts);
              yield { starship, films, pilots };
            } else {
              const starships = await fetchList('starships/', opts);
              yield { starships };
            }
            break;
          case 'vehicles':
            if (id) {
              const vehicle = await fetchOne(`vehicles/${id}`, opts);
              yield { vehicle };
              const films = await fetchMultiple(vehicle.films, opts);
              yield { vehicle, films };
              const pilots = await fetchMultiple(vehicle.pilots, opts);
              yield { vehicle, films, pilots };
            } else {
              const vehicles = await fetchList('vehicles/', opts);
              yield { vehicles };
            }
            break;
          default:
            throw new Error(`Unknown object type: ${type}`);
        }
      } catch (err) {
        if (i === 0) {
          throw err;
        }
      } finally {
        await eventual.updateRequest.for(refresh).minutes;
        console.log(`refreshing (${i + 1})...`)
      }
    }
  }, [ delay, id, refresh, type ]);
  return [ state, onRef.current.updateRequest ];
}

export function trimURL(url) {
  return url.substr(baseURL.length - 1);
}

export async function fetchOne(url, options) {
  const absURL = (new URL(url, baseURL)).toString();
  return fetchJSON(absURL, options);
}

export async function fetchList(url, options) {
  const lists = [];
  let absURL = (new URL(url, baseURL)).toString();
  do {
    const { results, next } = await fetchJSON(absURL, options);
    lists.push(results);
    absURL = next;
  } while (absURL);
  return lists.flat();
}

export async function fetchMultiple(urls, options) {
  return Promise.all(urls.map(url => fetchOne(url, options)));
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (res.status !== 200) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}
