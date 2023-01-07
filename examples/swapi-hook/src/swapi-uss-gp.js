import { useRef } from 'react';
import { useSequentialState, generateProps } from 'react-seq';

const baseURL = 'https://swapi.dev/api/';

export function useSWAPI(type, params = {}, options = {}) {
  const {
    delay = 100,
    refresh = 24 * 60,
  } = options;
  const { id } = params;
  const onRef = useRef();
  const state = useSequentialState(async function*({ initial, defer, flush, manageEvents, signal }) {
    initial({});
    const [ on, eventual ] = manageEvents();
    onRef.current = on;
    for (let i = 0;; i++) {
      defer(i === 0 ? delay : Infinity);
      try {
        const opts = { signal };
        let props;
        switch (type) {
          case 'people':
            if (id) {
              const person = await fetchOne(`people/${id}`, opts);
              props = {
                person,
                films: fetchMultiple(person.films, opts),
                species: fetchMultiple(person.species, opts),
                homeworld: fetchOne(person.homeworld, opts),
                vehicles: fetchMultiple(person.vehicles, opts),
                starships: fetchMultiple(person.starships, opts),
              };
            } else {
              props = { people: fetchList('people/', opts) };
            }
            break;
          case 'films':
            if (id) {
              const film = await fetchOne(`films/${id}`, opts);
              props = {
                film,
                characters: fetchMultiple(film.characters, opts),
                species: fetchMultiple(film.species, opts),
                planets: fetchMultiple(film.planets, opts),
                vehicles: fetchMultiple(film.vehicles, opts),
                starships: fetchMultiple(film.starships, opts),
              };
            } else {
              props = { films: fetchList('films/', opts) };
            }
            break;
          case 'planets':
            if (id) {
              const planet = await fetchOne(`planets/${id}`, opts);
              props = {
                planet,
                films: fetchMultiple(planet.films, opts),
                residents: fetchMultiple(planet.residents, opts),
              };
            } else {
              props = { planets: fetchList('planets/', opts) };
            }
            break;
          case 'species':
            if (id) {
              const species = await fetchOne(`species/${id}`, opts);
              props = {
                species,
                films: fetchMultiple(species.films, opts),
                people: fetchMultiple(species.people, opts),
                homeworld: fetchOne(species.homeworld, opts),
              };
            } else {
              props = { species: fetchList('species/', opts) };
            }
            break;
          case 'starships':
            if (id) {
              const starship = await fetchOne(`starships/${id}`, opts);
              props = {
                starship,
                films: fetchMultiple(starship.films, opts),
                pilots: fetchMultiple(starship.pilots, opts),
              };
            } else {
              props = { starships: fetchList('starships/', opts) };
            }
            break;
          case 'vehicles':
            if (id) {
              const vehicle = await fetchOne(`vehicles/${id}`, opts);
              props = {
                vehicle,
                films: fetchMultiple(vehicle.films, opts),
                pilots: fetchMultiple(vehicle.pilots, opts),
              };
            } else {
              props = { vehicles: fetchList('vehicles/', opts) };
            }
            break;
          default:
            throw new Error(`Unknown object type: ${type}`);
        }
        yield generateProps(props, {});
      } catch (err) {
        if (i === 0) {
          throw err;
        } else {
          flush(false);
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

export async function* fetchList(url, options) {
  let absURL = (new URL(url, baseURL)).toString();
  do {
    const { results, next } = await fetchJSON(absURL, options);
    yield results.values();
    absURL = next;
  } while (absURL);
}

export function* fetchMultiple(urls, options) {
  for (const url of urls) {
    yield fetchOne(url, options);
  }
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (res.status !== 200) {
    throw new HTTPError(res.status, res.statusText);
  }
  return res.json();
}

class HTTPError extends Error {
  constructor(status, statusText) {
    super(`${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
  }
}
