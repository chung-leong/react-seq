import { useProgressiveState } from 'react-seq';

export function useSWAPI(type, params = {}, options = {}) {
  const {
    delay = 100,
  } = options;
  const { id } = params;
  const state = useProgressiveState(async ({ initial, defer, usable, signal }) => {
    initial({});
    defer(delay);
    usable(0);
    const opts = { signal };
    switch (type) {
      case 'people':
        if (id) {
          const person = await fetchOne(`people/${id}`, opts);
          return {
            person,
            films: fetchMultiple(person.films, opts),
            species: fetchMultiple(person.species, opts),
            homeworld: fetchOne(person.homeworld, opts),
            vehicles: fetchMultiple(person.vehicles, opts),
            starships: fetchMultiple(person.starships, opts),
          };
        } else {
          return { people: fetchList('people/', opts) };
        }
      case 'films':
        if (id) {
          const film = await fetchOne(`films/${id}`, opts);
          return {
            film,
            characters: fetchMultiple(film.characters, opts),
            species: fetchMultiple(film.species, opts),
            planets: fetchMultiple(film.planets, opts),
            vehicles: fetchMultiple(film.vehicles, opts),
            starships: fetchMultiple(film.starships, opts),
          };
        } else {
          return { films: fetchList('films/', opts) };
        }
      case 'planets':
        if (id) {
          const planet = await fetchOne(`planets/${id}`, opts);
          return {
            planet,
            films: fetchMultiple(planet.films, opts),
            residents: fetchMultiple(planet.residents, opts),
          };
        } else {
          return { planets: fetchList('planets/', opts) };
        }
      case 'species':
        if (id) {
          const species = await fetchOne(`species/${id}`, opts);
          return {
            species,
            films: fetchMultiple(species.films, opts),
            people: fetchMultiple(species.people, opts),
            homeworld: fetchOne(species.homeworld, opts),
          };
        } else {
          return { species: fetchList('species/', opts) };
        }
      case 'starships':
        if (id) {
          const starship = await fetchOne(`starships/${id}`, opts);
          return {
            starship,
            films: fetchMultiple(starship.films, opts),
            pilots: fetchMultiple(starship.pilots, opts),
          };
        } else {
          return { starships: fetchList('starships/', opts) };
        }
      case 'vehicles':
        if (id) {
          const vehicle = await fetchOne(`vehicles/${id}`, opts);
          return {
            vehicle,
            films: fetchMultiple(vehicle.films, opts),
            pilots: fetchMultiple(vehicle.pilots, opts),
          };
        } else {
          return { vehicles: fetchList('vehicles/', opts) };
        }
      default:
        throw new Error(`Unknown object type: ${type}`);
    }
  }, [ delay, id, type ]);
  return [ state, () => {} ];
}

const baseURL = 'https://swapi.dev/api/';

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
