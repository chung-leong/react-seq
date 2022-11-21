import Chai from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import ChaiThings from 'chai-things';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import 'mocha-skip-if';

Chai.use(ChaiAsPromised);
Chai.use(ChaiThings);

if (!(AbortController in global)) {
  global.AbortController = AbortController;
}
global.fetch = fetch;

process.env.NODE_ENV = 'development';

skip
  .condition('dom.is.absent', typeof(window) !== 'object')
  .condition('in.development.mode', process.env.NODE_ENV === 'development');
