import { readFile } from 'fs/promises';
import Fastify from 'fastify';
import Etag from '@fastify/etag';
import Static from '@fastify/static';
import Caching from '@fastify/caching';
import Compression from '@fastify/compress';

export async function startServer() {
  const { ssl, keyPath, certPath, listen } = await loadSettings();
  // use HTTP2 when SSL is available
  const http2 = !!ssl;
  const https = (ssl) ? await loadCertificate(keyPath, certPath) : undefined;
  const fastify = Fastify({ http2, https, trustProxy: true });
  // use automatic etag generation
  await fastify.register(Etag);
  // use cache control
  await fastify.register(Caching, { privacy: 'public', expiresIn: 300 });
  // use compression
  await fastify.register(Compression);
  // handle static files
  await fastify.register(Static, { root: resolve('../build'), prefix: '/build/' });
  // register routes
  fastify.get('/api/:table/', async (req) => {
    const host = `${req.protocol}://${req.hostname}`;
    const { table } = req.params, { page = '1' } = req.query;
    const objects = await loadTable(table);
    const slice = objects.slice((page - 1) * 10, page * 10);
    const count = objects.length;
    const next = (page * 10 < count) ? getPageURL(host, table, page + 1) : null;
    const prev = (page > 1) ? getPageURL(host, table, page - 1) : null;
    const results = slice.map(obj => attachURLs(host, table, obj));
    return { count, next, prev, results };
  });
  fastify.get('/api/:table/:id', async (req) => {
    const host = `${req.protocol}://${req.hostname}`;
    const { id, table } = req.params;
    const object = await loadObject(table, id);
    const result = attachURLs(host, table, object);
    return result;
  })
  fastify.get('/static/:folder/:file', async (req, reply) => {
    const { folder, file } = req.params;
    return reply.sendFile(`static/${folder}/${file}`);
  });
  fastify.get('/*', async (req, reply) => {
    const path = req.params['*'];
    if (path.includes('.')) {
      // it's a file at the root-level probably
      return reply.sendFile(path);
    }
    return path;
  });
  // start listening for requests
  const address = parseBindAddress(listen)
  await fastify.listen(address);
}

async function loadSettings() {
  return JSON.parse(await readFile(resolve('./settings.json')));
}

async function loadCertificate(keyPath, certPath) {
  const key = await readFile(resolve(keyPath));
  const cert = await readFile(resolve(certPath));
  return { key, cert };
}

function parseBindAddress(address) {
  if (address.includes(':')) {
    const parts = address.split(':');
    const port = parseInt(parts[1]);
    const host = parts[0];
    return { port, host };
  } else {
    return { port: parseInt(address) };
  }
}

function getObjectURL(host, table, id) {
  return `${host}/api/${table}/${id}/`
}

function getPageURL(host, table, page) {
  let url = `${host}/api/${table}/`;
  if (page > 1) {
    url += `?page=${page}`;
  }
  return url;
}

function attachURLs(host, table, object) {
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
  const url = getObjectURL(host, table, object.id);
  const newObject = { url };
  for (let [ name, value ] of Object.entries(object)) {
    if (name !== 'id') {
      const relatedTable = relations[name];
      if (relatedTable) {
        if (value instanceof Array) {
          value = value.map(value => getObjectURL(host, relatedTable, value));
        } else {
          value = getObjectURL(host, relatedTable, value);
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


function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}

class HTTPError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

startServer();
