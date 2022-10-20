import { expect } from 'chai';
import { delay } from '../index.js';
import React from 'react';

import {
  EventManager,
} from '../src/event-manager.js';

describe('#EventManager', function() {
  it('should return two proxies, one yielding functions, the other promises', function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click;
    const promise = eventual.click;
    expect(handler).to.be.a('function');
    expect(promise).to.be.a('promise');
  })
  it('should create handler that triggers the fulfillment of the corresponding promise', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click;
    const promise = eventual.click;
    expect(handler).to.be.a('function');
    handler(5);
    const value = await promise;
    expect(value).to.equal(5);
  })
  it('should create a handler that triggers fulfillment with specified value', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind(6);
    const promise1 = eventual.click;
    const promise2 = eventual.keypress;
    setTimeout(() => handler(5), 10);
    const value1 = await promise1;
    expect(value1).to.equal(6);
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
  })
  it('should use the second argument as the fulfillment value as well', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind(null, 6);
    const promise = eventual.click;
    setTimeout(() => handler(5), 10);
    const value = await promise;
    expect(value).to.equal(6);
  })
  it('should create a handler that triggers fulfillment with specified string', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.ok;
    const promise1 = eventual.click;
    const promise2 = eventual.keypress;
    setTimeout(() => handler(5), 10);
    const value1 = await promise1;
    expect(value1).to.equal('ok');
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
  })
  it('should create handlers that are invariant', function() {
    const { on, eventual } = new EventManager({});
    expect(on.click).to.equal(on.click);
    expect(on.click.ok).to.equal(on.click.ok);
    const obj = {};
    expect(on.click.bind(obj)).to.equal(on.click.bind(obj));
  })
  it('should maintain invariance for up to 128 scalar-value handlers', function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click[1];
    for (let i = 2; i <= 128; i++) {
      const handlerI = on.click[i];
    }
    expect(handler1).to.equal(on.click[1]);
    const handler129 = on.click[129];
    expect(handler1).to.not.equal(on.click[1]);
  })
  it('should return new promise after previous one has been fulfilled', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind(6);
    const promise1 = eventual.click;
    handler(5);
    const value1 = await promise1;
    const promise2 = eventual.click;
    expect(promise2).to.not.equal(promise1);
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
  })
  it('should create promises that can be chained', async function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click;
    const handler2 = on.keypress;
    const promise1 = eventual.click.or.keypress;
    const promise2 = eventual.click.and.keypress;
    expect(promise1).to.a('promise');
    handler1(8);
    const value1 = await promise1;
    expect(value1).to.equal(8);
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
    handler2(17);
    const value3 = await Promise.race([ promise2, delay(10) ]);
    expect(value3).to.eql([ 8, 17 ]);
  })
  it('should create promises that can be chained with other promises', async function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click;
    const promise1 = eventual.click.or(delay(100)).or(delay(300));
    const promise2 = eventual.click.and(delay(30));
    const promise3 = eventual(delay(10)).and(Promise.resolve(18));
    expect(promise1).to.a('promise');
    handler1(8);
    const value1 = await promise1;
    expect(value1).to.equal(8);
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
    const value3 = await promise3;
    expect(value3).to.eql([ undefined, 18 ]);
    delay(25);
    const value4 = await Promise.race([ promise2, delay(20) ]);
    expect(value4).to.eql([ 8, undefined ]);
  })
  it('should abort successfully when external promise has been wrapped with eventual', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const { on, eventual, reject } = new EventManager({ signal });
    const dead = new Promise(() => {});
    setTimeout(() => abortController.abort(), 10);
    let error;
    try {
      await eventual(slow);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error');
  })
  it('should cause all to reject when abort controller signals', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const { on, eventual, reject } = new EventManager({ signal });
    debugger;
    setTimeout(() => abortController.abort(), 10);
    let error;
    try {
      await eventual.click;
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error');
  })
  it('should not allow the setting of properties', function() {
    const { on, eventual } = new EventManager({});
    expect(() => on.click = null).to.throw();
    expect(() => eventual.click = null).to.throw();
  })
  it('should issue warning about lack of action when warning is set to true', async function() {
    const warnFn = console.warn;
    let message;
    console.warn = (msg) => message = msg;
    try {
      const { on, eventual } = new EventManager({ warning: true });
      const handler = on.click;
      handler();
    } finally {
      console.warn = warnFn;
    }
    expect(message).to.be.a('string');
  })
})
