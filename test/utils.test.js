import { expect } from 'chai';
import sinon from 'sinon';
import { noConsole } from './error-handling.js';

import {
  delay,
  meanwhile,
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
  it('should fail immediately when signal is already on', async function() {
    // can't use AbortSignal.abort() as it's missing from the implementation
    const abortController = new AbortController();
    const { signal } = abortController;
    abortController.abort();
    let error;
    try {
      await delay(20, { signal });
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

describe('#meanwhile()', function() {
  it('should run the function given to it', function() {
    let ran = false;
    meanwhile(async () => {
      ran = true;
    });
    expect(ran).to.be.true;
  })
  it('should do nothing when no function is given', async function() {
    const { error } = await noConsole(() => {
      meanwhile();
    });
    expect(error).to.be.null;
  })
  it('should output errors to console', async function() {
    const { error } = await noConsole(async () => {
      await meanwhile(async () => {
        throw new Error('Rats live on no evil star');
      });
    });
    expect(error).to.be.an('error').with.property('message', 'Rats live on no evil star');
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
