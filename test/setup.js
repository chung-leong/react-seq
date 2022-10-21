import Chai from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import 'mocha-skip-if';

global.AbortController = AbortController;
global.fetch = fetch;

Chai.use(ChaiAsPromised);
