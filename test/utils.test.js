import { expect } from 'chai';
import sinon from 'sinon';

import {
  delay,
  preload,
  Abort,
} from '../index.js';
import {
  isAbortError,
} from '../src/utils.js';

describe('#delay()', function() {
  it('should return a promise that is fulfilled after a delay', async function() {
    const promise = delay(20);
    expect(promise).to.be.a('promise');
    await promise;
  })
  it('should resolve to specified value after a delay', async function() {
    const promise = delay(20, { value: 5 });
    expect(promise).to.be.a('promise');
    const value = await promise;
    expect(value).to.equal(5);
  })
  it('should fail with Abort when abort controller fires', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    let error;
    try {
      setTimeout(() => abortController.abort(), 10);
      await delay(5000, { signal });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.instanceOf(Abort);
  })
  it('should remove listener on signal timeout fires', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const spy = sinon.spy(signal, 'removeEventListener');
    let error;
    try {
      await delay(20, { signal });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.undefined;
    expect(spy.called).to.be.true;
  })
})

describe('#preload()', function() {
  it('should run the function given to it', function() {
    let ran = false;
    preload(async () => {
      ran = true;
    });
    expect(ran).to.be.true;
  })
  it('should output errors to console', async function() {
    let error;
    const stub = sinon.stub(console, 'error').callsFake(err => error = err);
    try {
      await preload(async () => {
        throw new Error('Rats live on no evil star');
      });
      expect(error).to.be.an('error').with.property('message', 'Rats live on no evil star');
    } finally {
      stub.restore();
    }
  })
})

describe('#isAbortError()', function() {
  it('should return true if error object is caused by aborting a fetch operation', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    let error;
    try {
      setTimeout(() => abortController.abort(), 0);
      const res = await fetch('http://google.com', { signal });
    } catch (err) {
      error = err;
    }
    expect(isAbortError(error)).to.be.true;
  })
})
