import Chai from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import AbortController from 'abort-controller';
import 'mocha-skip-if';

global.AbortController = AbortController;

Chai.use(ChaiAsPromised);
