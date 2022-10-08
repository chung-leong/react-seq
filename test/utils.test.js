import { expect } from 'chai';

import {
  delay,
  preload,
  when,
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

describe('#when()', function() {
  it('should run the function when condition is true', function() {
    let ran = false;
    const result = when(2 + 2 === 4, () => {
      ran = true;
      return 4;
    });
    expect(ran).to.be.true;
    expect(result).to.equal(4);
  })
  it('should not run the function when condition is false', function() {
    let ran = false;
    const result = when(2 + 2 === 5, () => {
      ran = true;
      return 5;
    });
    expect(ran).to.be.false;
    expect(result).to.be.undefined;
  })
  it('should simply return the value when a non-function is given', function() {
    const result = when(2 + 2 === 4, 4);
    expect(result).to.equal(4);
  })
  it('should issue a warning when given an async function', function() {
    const warnFn = console.warn;
    let message;
    console.warn = (msg) => message = msg;
    const nodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development';
    try {
      when(2 + 2 == 4, async () => 'Hello');
    } finally {
      console.warn = warnFn;
      process.env.NODE_ENV = nodeEnv;
    }
    expect(message).to.be.a('string');
  })
})
