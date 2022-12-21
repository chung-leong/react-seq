import { expect } from 'chai';
import { delay } from '../index.js';
import React from 'react';
import { withSilentConsole } from './error-handling.js';

import {
  EventManager,
} from '../src/event-manager.js';
import {
  important,
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
    const result = await promise;
    expect(result).to.eql({ click: 5 });
  })
  it('should return just the fulfillment value when value is called', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click;
    const promise = eventual.click.value();
    setTimeout(() => handler(6), 10);
    const result = await promise;
    expect(result).to.eql(6);
  })
  it('should return plain-old promise when value is called', async function() {
    const { on, eventual } = new EventManager({});
    const promise = eventual.click.value();
    expect(promise.constructor).to.equal(Promise);
  })
  it('should create a handler that triggers fulfillment with specified value', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind(6);
    const promise1 = eventual.click;
    const promise2 = eventual.keypress;
    setTimeout(() => handler(5), 10);
    const result1 = await promise1;
    expect(result1).to.eql({ click: 6 });
    const result2 = await Promise.race([ promise2, delay(5) ]);
    expect(result2).to.be.undefined;
  })
  it('should create a handler that triggers fulfillment with given object', async function() {
    const { on, eventual } = new EventManager({});
    const object = { hello: 'world' };
    const handler = on.click.bind(object);
    const promise1 = eventual.click;
    const promise2 = eventual.keypress;
    setTimeout(() => handler(5), 10);
    const result1 = await promise1;
    expect(result1.click).to.equal(object);
    const result2 = await Promise.race([ promise2, delay(5) ]);
    expect(result2).to.be.undefined;
  })
  it('should use the second argument as the fulfillment value as well', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind(null, 6);
    const promise = eventual.click;
    setTimeout(() => handler(5), 10);
    const result = await promise;
    expect(result).to.eql({ click: 6 });
  })
  it('should create a handler that triggers fulfillment with specified string', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind('ok');
    const promise1 = eventual.click;
    const promise2 = eventual.keypress;
    setTimeout(() => handler(5), 10);
    const result1 = await promise1;
    expect(result1).to.eql({ click: 'ok' });
    const result2 = await Promise.race([ promise2, delay(5) ]);
    expect(result2).to.be.undefined;
  })
  it('should create handlers that are invariant', function() {
    const { on, eventual } = new EventManager({});
    expect(on.click).to.equal(on.click);
    expect(on.click.bind('ok')).to.equal(on.click.bind('ok'));
    const obj = {};
    expect(on.click.bind(obj)).to.equal(on.click.bind(obj));
  })
  it('should maintain invariance for up to 128 scalar-value handlers', function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click.bind(1);
    for (let i = 2; i <= 128; i++) {
      const handlerI = on.click.bind(i);
    }
    expect(handler1).to.equal(on.click.bind(1));
    const handler129 = on.click.bind(129);
    expect(handler1).to.not.equal(on.click.bind(1));
  })
  it('should return new promise after previous one has been fulfilled', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.bind(6);
    const promise1 = eventual.click;
    handler(5);
    const result1 = await promise1;
    const promise2 = eventual.click;
    expect(promise2).to.not.equal(promise1);
    const result2 = await Promise.race([ promise2, delay(5) ]);
    expect(result2).to.be.undefined;
  })
  it('should create promises that can be chained', async function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click;
    const handler2 = on.keypress;
    const promise1 = eventual.click.or.keypress;
    const promise2 = eventual.click.and.keypress;
    expect(promise1).to.a('promise');
    handler1(8);
    const result1 = await promise1;
    expect(result1).to.eql({ click: 8 });
    const result2 = await Promise.race([ promise2, delay(5) ]);
    expect(result2).to.be.undefined;
    handler2(17);
    const value3 = await Promise.race([ promise2, delay(5) ]);
    expect(value3).to.eql({ click: 8, keypress: 17 });
  })
  it('should create promises that can be chained with other promises', async function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click;
    const promise1 = eventual.click.or('timeout1', delay(100)).or('timeout2', delay(300));
    const promise2 = eventual.click.and('timeout', delay(30));
    const promise3 = eventual('timeout', delay(10)).and('instant', Promise.resolve(18));
    expect(promise1).to.a('promise');
    handler1(8);
    const result1 = await promise1;
    expect(result1).to.eql({ click: 8 });
    const result2 = await Promise.race([ promise2, delay(10) ]);
    expect(result2).to.be.undefined;
    const value3 = await promise3;
    expect(value3).to.eql({ timeout: undefined, instant: 18 });
    delay(25);
    const value4 = await Promise.race([ promise2, delay(20) ]);
    expect(value4).to.eql({ click: 8, timeout: undefined });
  })
  it('should create filtering handler when apply is used', async function() {
    const { on, eventual } = new EventManager({});
    const filter = a => `[${a}]`;
    const handler = on.click.apply(filter);
    expect(handler).to.equal(on.click.apply(filter));
    setTimeout(() => handler('hello'), 10);
    const value = await eventual.click;
    expect(value).to.eql({ click: '[hello]' });
  })
  it('should behave as expected apply is called in the normal way', async function() {
    const { on, eventual } = new EventManager({});
    setTimeout(() => on.click.apply(), 10);
    const result1 = await eventual.click;
    expect(result1).to.eql( { click: undefined });
    setTimeout(() => on.click.apply(null, [ 'duck' ]), 10);
    const result2 = await eventual.click;
    expect(result2).to.be.eql({ click: 'duck' });
  })
  it('should allow value marked by important to be retrieved later', async function() {
    const { on, eventual } = new EventManager({});
    const handler = on.click.apply(important);
    handler('Turkey');
    const result1 = await eventual.click;
    expect(result1).to.eql({ click: 'Turkey' });
    const result2 = await eventual.click.or('timeout', delay(10));
    expect(result2).to.eql({ timeout: undefined });
  })
  it('should throw value marked by throwing', async function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on.click;
    const handler2 = on.click.apply(throwing);
    setTimeout(() => handler1(new Error), 10);
    const result1 = await eventual.click;
    expect(result1.click).to.be.instanceOf(Error);
    handler2(important(new Error('Hello world')));
    let error1;
    try {
      await eventual.click;
    } catch (err) {
      error1 = err;
    }
    expect(error1).to.be.instanceOf(Error);
    handler2(important('Hello world!!!'));
    let error2;
    try {
      await eventual.click;
    } catch (err) {
      error2 = err;
    }
    expect(error2).to.be.instanceOf(Error);
    expect(error2.message).to.equal('Hello world!!!');
    handler2(important({ type: 'error', error: new Error('Hello')}));
    let error3;
    try {
      await eventual.click;
    } catch (err) {
      error3 = err;
    }
    expect(error3).to.be.instanceOf(Error);
  })
  it('should abort successfully when external promise has been wrapped with eventual()', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const { on, eventual } = new EventManager({ signal });
    const dead = Promise.race([]);
    setTimeout(() => abortController.abort(), 10);
    let error;
    try {
      await eventual('dead', dead);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').that.is.instanceOf(Abort);
  })
  it('should cause all to reject when abort controller signals', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const { on, eventual } = new EventManager({ signal });
    setTimeout(() => abortController.abort(), 10);
    let error;
    try {
      await eventual.click;
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error');
  })
  it('should permit attachment of timeout', async function() {
    const { on, eventual } = new EventManager({});
    const promise = eventual.click.for(20).milliseconds;
    expect(promise).to.be.a('promise');
    const result = await promise;
    expect(result).to.eql({ timeout: 20 });
  })
  it('should cancel timeout when promise is fulfilled', async function() {
    const { on, eventual } = new EventManager({});
    const promise = eventual.click.for(20).milliseconds;
    expect(promise).to.be.a('promise');
    on.click('clicked');
    const result = await promise;
    expect(result).to.not.eql({ timeout: 20 });
  })
  it('should permit attachment of timeout to promise chain', async function() {
    const { on, eventual } = new EventManager({});
    const promise = eventual.click.and.keypress.or.scroll.for(20).milliseconds;
    expect(promise).to.be.a('promise');
    const result = await promise;
    expect(result).to.eql({ timeout: 20 });
  })
  it('should combine results from multiple promises chained with and', async function() {
    const { on, eventual } = new EventManager({});
    const promise = eventual.click.and.keypress.and.scroll.and.resize;
    expect(promise).to.be.a('promise');
    on.click('done');
    on.keypress('done');
    on.scroll('done');
    on.resize('done');
    const result = await promise;
    expect(result).to.eql({ click: 'done', keypress: 'done', scroll: 'done', resize: 'done' });
  })
  it('should simply return the promise when delay is Infinity', async function() {
    const { on, eventual } = new EventManager({});
    const promise = eventual.click.for(Infinity).milliseconds;
    expect(promise).to.be.equal(eventual.click);
  })
  it('should throw an error when .for() is awaited upon', async function() {
    const { on, eventual } = new EventManager({});
    let error;
    try {
      await eventual.click.for(30);
    } catch (err) {
      error = err;
    }
    expect(error.message).to.equal('No time unit selected');
  })
  it('should throw an error when an unrecognized time unit is selected', async function() {
    const { on, eventual } = new EventManager({});
    let error;
    try {
      await eventual.click.for(30).lightyears;
    } catch (err) {
      error = err;
    }
    expect(error.message).to.equal('Invalid time unit: lightyears');
  })
  it('should throw an invalid number is given', async function() {
    const { on, eventual } = new EventManager({});
    let error;
    try {
      await eventual.click.for(undefined).hours;
    } catch (err) {
      error = err;
    }
    expect(error.message).to.equal(`Invalid duration: undefined`);
  })
  it('should not allow the setting of properties', function() {
    const { on, eventual } = new EventManager({});
    expect(() => on.click = null).to.throw();
    expect(() => eventual.click = null).to.throw();
  })
  it('should issue warning about lack of action when warning is set to true', async function() {
    const output = {};
    await withSilentConsole(async () => {
      const { on, eventual } = new EventManager({ warning: true });
      const handler = on.click;
      handler();
    }, output);
    expect(output.warn).to.be.a('string');
  })
  it('should issue warning about awaiting promise without corresponding handler', async function() {
    const output = {};
    await withSilentConsole(async () => {
      const { on, eventual } = new EventManager({ warning: true });
      const promise = eventual.click;
      await Promise.race([ promise, Promise.resolve() ]);
    }, output);
    expect(output.warn).to.be.a('string');
  })
  it('should yield undefined when symbols are used to access properties', async function() {
    const { on, eventual } = new EventManager({});
    const handler1 = on[Symbol.iterator];
    const handler2 = on.click[Symbol.iterator];
    const promise1 = eventual[Symbol.iterator];
    const promise2 = eventual.click.and[Symbol.iterator];
    const promise3 = eventual.click.for(5)[Symbol.iterator];
    expect(handler1).to.be.undefined;
    expect(handler2).to.be.undefined;
    expect(promise1).to.be.undefined;
    expect(promise2).to.be.undefined;
    expect(promise3).to.be.undefined;
  })
  it('should yield promises with expected names', async function() {
    const { on, eventual } = new EventManager({});
    const promise = Promise.resolve();
    expect(eventual.click).to.have.property('name', 'click');
    expect(eventual.click.or.keyPress).to.have.property('name', 'click.or.keyPress');
    expect(eventual.click.and.keyPress).to.have.property('name', 'click.and.keyPress');
    expect(eventual('hello', promise)).to.have.property('name', 'hello');
    expect(eventual('hello', promise).or.click).to.have.property('name', 'hello.or.click');
    expect(eventual('hello', promise).or.click.and('world', promise)).to.have.property('name', 'hello.or.click.and.world');
    expect(eventual.click.and.keyPress.for(5).minutes).to.have.property('timeout', 5 * 60 * 1000);
  })
  it('should invoke onAwaitStart when await occurs', async function() {
    let count = 0;
    function onAwaitStart() {
      count++;
    }
    const { on, eventual } = new EventManager({ onAwaitStart });
    await eventual.click.for(5).milliseconds;
    expect(count).to.equal(1);
    await eventual.keyPress.or.apocalypse.for(5).milliseconds;
    expect(count).to.equal(2);
  })
  it('should invoke onAwaitEnd when awaiting ends', async function() {
    let started = 0, ended = 0;
    function onAwaitStart() {
      started++;
    }
    function onAwaitEnd() {
      ended++;
    }
    const { on, eventual } = new EventManager({ onAwaitStart, onAwaitEnd });
    await eventual.click.for(5).milliseconds;
    expect(started).to.equal(1);
    expect(ended).to.equal(1);
    await eventual.keyPress.or.apocalypse.for(5).milliseconds;
    expect(started).to.equal(2);
    expect(ended).to.equal(2);
    const promise = eventual.worldPeace.for(10).milliseconds;
    promise.then(() => {});
    expect(started).to.equal(3);
    expect(ended).to.equal(2);
    promise.reject(new Error('Never gonna happen'));
    await delay(5);
    expect(ended).to.equal(3);
  })
  it('should throw when eventual is called without a name', async function() {
    const { on, eventual } = new EventManager({});
    expect(() => eventual(Promise.resolve(1))).to.throw()
      .with.property('message', 'A name for the promise is expected');
  })
  it('should throw when .or or .and is called without a name', async function() {
    const { on, eventual } = new EventManager({});
    expect(() => eventual.click.or(Promise.resolve(1))).to.throw()
      .with.property('message', 'A name for the promise is expected');
    expect(() => eventual.click.and(Promise.resolve(1))).to.throw()
      .with.property('message', 'A name for the promise is expected');
  })
})
