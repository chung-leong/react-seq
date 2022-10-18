import { expect } from 'chai';

import {
  delay,
  preload,
} from '../index.js';

describe('#delay()', function() {
  it('should return a promise that is fulfilled after a delay', async function() {
    const promise = delay(20);
    expect(promise).to.be.a('promise');
    await promise;
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
    const errorFn = console.error;
    let error;
    console.error = (err) => error = err;
    try {
      await preload(async () => {
        throw new Error('Rats live on no evil star');
      });
    } finally {
      console.error = errorFn;
    }
    expect(error).to.be.an('error').with.property('message', 'Rats live on no evil star');
  })
})
