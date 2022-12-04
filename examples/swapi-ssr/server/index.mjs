import Fastify from 'fastify';
import Etag from '@fastify/etag';
import Static from '@fastify/static';
import Caching from '@fastify/caching';
import Compression from '@fastify/compress';
import CORS from '@fastify/cors';
import opener from 'opener';
import { renderInChildProc } from 'react-seq/server';
import { loadTablePage, loadTableObject } from './data.mjs';

const { pathname: buildPath } = new URL('../build', import.meta.url);

(async () => {
  const fastify = Fastify({ ignoreTrailingSlash: true, trustProxy: true });
  // use automatic etag generation
  await fastify.register(Etag);
  // use cache control
  await fastify.register(Caching, { privacy: 'public', expiresIn: 300 });
  // use compression
  await fastify.register(Compression);
  // allow CORS
  await fastify.register(CORS, { origin: true });
  // add sendFile() to reply object
  await fastify.register(Static, { root: buildPath, serve: false });
  // register routes
  fastify.get('/api/:table', async (req, reply) => {
    const origin = `${req.protocol}://${req.hostname}`;
    const { table } = req.params;
    const page = parseInt(req.query.page) || 1;
    return loadTablePage(origin, table, page);
  });
  fastify.get('/api/:table/:id', async (req) => {
    const origin = `${req.protocol}://${req.hostname}`;
    const { table, id } = req.params;
    return loadTableObject(origin, table, id);
  })
  fastify.get('/*', async (req, reply) => {
    const path = req.params['*'];
    if (path.includes('.')) {
      // it's a request for a static file
      return reply.sendFile(path);
    } else {
      // render our app
      reply.type('text/html');
      const location = `${req.protocol}://${req.hostname}/${path}`;
      console.log(`Generating ${location}`);
      return renderInChildProc(location, buildPath);
    }
  });
  // start listening for requests
  await fastify.listen({ host: 'localhost', port: 8080 });
  console.log(`Running test website at http://localhost:8080/`);
  opener(`http://localhost:8080/`);
})();
