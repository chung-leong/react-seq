import { expect } from 'chai';
import { delay } from '../index.js';
import React from 'react';
import { noConsole } from './error-handling.js';

import {
  EventManager,
} from '../src/event-manager.js';
import {
  important,
  persistent,
  throwing,
  Abort,
} from '../index.js';

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
    const value2 = await Promise.race([ promise2, delay(5) ]);
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
    const value2 = await Promise.race([ promise2, delay(5) ]);
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
    const value2 = await Promise.race([ promise2, delay(5) ]);
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
    const value2 = await Promise.race([ promise2, delay(5) ]);
    expect(value2).to.be.undefined;
    handler2(17);
    const value3 = await Promise.race([ promise2, delay(5) ]);
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
  it('should create filtering handler when apply() is used', async function() {
    const { on, eventual, reject } = new EventManager({});
    const filter = a => `[${a}]`;
    const handler = on.click.apply(filter);
    expect(handler).to.equal(on.click.apply(filter));
    setTimeout(() => handler('hello'), 10);
    const value = await eventual.click;
    expect(value).to.equal('[hello]');
  })
  it('should behave as expected apply() is called in the normal way', async function() {
    const { on, eventual, reject } = new EventManager({});
    setTimeout(() => on.click.apply(), 10);
    const value1 = await eventual.click;
    expect(value1).to.be.undefined;
    setTimeout(() => on.click.apply(null, [ 'duck' ]), 10);
    const value2 = await eventual.click;
    expect(value2).to.be.equal('duck');
  })
  it('should allow value marked by important() to be retrieved later', async function() {
    const { on, eventual, reject } = new EventManager({});
    const handler = on.click.apply(important);
    handler('Turkey');
    const value1 = await eventual.click;
    expect(value1).to.equal('Turkey');
    const value2 = await eventual.click.or(delay(10));
    expect(value2).to.equal(undefined);
  })
  it('should allow value marked by persistent() to be retrieved again and again', async function() {
    const { on, eventual, reject } = new EventManager({});
    const handler = on.click.apply(persistent);
    handler('Turkey');
    const value1 = await eventual.click;
    expect(value1).to.equal('Turkey');
    const value2 = await eventual.click.or(delay(10));
    expect(value2).to.equal('Turkey');
    const value3 = await eventual.click;
  })
  it('should throw value marked by throwing()', async function() {
    const { on, eventual, reject } = new EventManager({});
    const handler1 = on.click;
    const handler2 = on.click.apply(throwing);
    setTimeout(() => handler1(new Error), 10);
    const value1 = await eventual.click;
    expect(value1).to.be.instanceOf(Error);
    handler2(new Error('Hello world'));
    let error1;
    try {
      await eventual.click;
    } catch (err) {
      error1 = err;
    }
    expect(error1).to.be.instanceOf(Error);
    handler2('Hello world!!!');
    let error2;
    try {
      await eventual.click;
    } catch (err) {
      error2 = err;
    }
    expect(error2).to.be.instanceOf(Error);
    expect(error2.message).to.equal('Hello world!!!');
    handler2({ type: 'error', error: new Error('Hello')});
    let error3;
    try {
      await eventual.click;
    } catch (err) {
      error3 = err;
    }
    expect(error3).to.be.instanceOf(Error);
  })
  it('should force creation of new promises when after a regular handler is called', async function() {
    const { on, eventual, reject } = new EventManager({});
    const handler1 = on.click.apply(persistent);
    const handler2 = on.click;
    handler1('Turkey');
    const value1 = await eventual.click;
    expect(value1).to.equal('Turkey');
    const value2 = await eventual.click.or(delay(10));
    expect(value2).to.equal('Turkey');
    const value3 = await eventual.click;
    handler2('Weasel');
    const value4 = await eventual.click.or(delay(10));
    expect(value4).to.be.undefined;
  })
  it('should force creation of new promises when after an important handler is called', async function() {
    const { on, eventual, reject } = new EventManager({});
    const handler1 = on.click.apply(persistent);
    const handler2 = on.click.apply(important);
    handler1('Turkey');
    const value1 = await eventual.click;
    expect(value1).to.equal('Turkey');
    const value2 = await eventual.click.or(delay(10));
    expect(value2).to.equal('Turkey');
    const value3 = await eventual.click;
    handler2('Weasel');
    const value4 = await eventual.click.or(delay(10));
    expect(value4).to.equal('Weasel');
    const value5 = await eventual.click.or(delay(10));
    expect(value5).to.be.undefined;
  })
  it('should abort successfully when external promise has been wrapped with eventual()', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const { on, eventual, reject } = new EventManager({ signal });
    const dead = Promise.race([]);
    setTimeout(() => abortController.abort(), 10);
    let error;
    try {
      await eventual(dead);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').that.is.instanceOf(Abort);
  })
  it('should cause all to reject when abort controller signals', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const { on, eventual, reject } = new EventManager({ signal });
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
    const { warn } = await noConsole(async () => {
      const { on, eventual } = new EventManager({ warning: true });
      const handler = on.click;
      handler();
    });
    expect(warn).to.be.a('string');
  })
  it('should issue warning about awaiting promise without corresponding handler', async function() {
    const { warn } = await noConsole(async () => {
      const { on, eventual } = new EventManager({ warning: true });
      const promise = eventual.click;
      await Promise.race([ promise, Promise.resolve() ]);
    });
    expect(warn).to.be.a('string');
  })
})
