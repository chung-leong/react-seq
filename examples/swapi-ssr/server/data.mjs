import { readFile } from 'fs/promises';

export async function loadTablePage(origin, table, page) {
  const objects = await loadTable(table);
  const slice = objects.slice((page - 1) * 10, page * 10);
  const count = objects.length;
  const next = (page * 10 < count) ? getPageURL(origin, table, page + 1) : null;
  const prev = (page > 1) ? getPageURL(origin, table, page - 1) : null;
  const results = slice.map(obj => attachURLs(origin, table, obj));
  return { count, next, prev, results };
}

export async function loadTableObject(origin, table, id) {
  const object = await loadObject(table, id);
  const result = attachURLs(origin, table, object);
  return result;
}

function getObjectURL(origin, table, id) {
  return `${origin}/api/${table}/${id}/`
}

function getPageURL(origin, table, page) {
  let url = `${origin}/api/${table}/`;
  if (page > 1) {
    url += `?page=${page}`;
  }
  return url;
}

function attachURLs(origin, table, object) {
  const relations = {
    characters: 'people',
    films: 'films',
    homeworld: 'planets',
    people: 'people',
    pilots: 'people',
    planets: 'planets',
    residents: 'people',
    species: 'species',
    starships: 'starships',
    vehicles: 'vehicles',
  };
  const url = getObjectURL(origin, table, object.id);
  const newObject = { url };
  for (let [ name, value ] of Object.entries(object)) {
    if (name !== 'id') {
      const relatedTable = relations[name];
      if (relatedTable) {
        if (value instanceof Array) {
          value = value.map(value => getObjectURL(origin, relatedTable, value));
        } else {
          value = getObjectURL(origin, relatedTable, value);
        }
      }
      newObject[name] = value;
    }
  }
  return newObject;
}

async function loadTable(table) {
  try {
    const path = `./data/${table}.json`;
    return JSON.parse(await readFile(resolve(path)));
  } catch (err) {
    console.error(err);
    throw new HTTPError(404, 'Not found');
  }
}

async function loadObject(table, id) {
  const objects = await loadTable(table);
  const object = objects.find(obj => obj.id == id);
  if (!object) {
    throw new HTTPError(404, 'Not found');
  }
  return object;
}

class HTTPError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}
