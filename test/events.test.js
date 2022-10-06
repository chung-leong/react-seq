import { expect } from 'chai';
import { delay } from '../src/utils.js';

import {
  manageEvents,
} from '../src/events.js';

describe('#manageEvents()', function() {
  it('should return two proxies, one yielding functions, the other promises', function() {
    const [ on, eventual ] = manageEvents();
    const builder = on.click;
    const promise = eventual.click;
    expect(builder).to.be.a('function');
    expect(promise).to.be.a('promise');
  })
  it('should create a handler that triggers the fulfillment of the corresponding promise', async function() {
    const [ on, eventual ] = manageEvents();
    const handler = on.click();
    const promise = eventual.click;
    expect(handler).to.be.a('function');
    handler(5);
    const value = await promise;
    expect(value).to.equal(5);
  })
  it('should create a handler that triggers fulfillment with specified value', async function() {
    const [ on, eventual ] = manageEvents();
    const handler = on.click(6);
    const promise1 = eventual.click;
    const promise2 = eventual.keypress;
    setTimeout(() => handler(5), 10);
    const value1 = await promise1;
    expect(value1).to.equal(6);
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
  })
  it('should return new promise after previous one has been fulfilled', async function() {
    const [ on, eventual ] = manageEvents();
    const handler = on.click(6);
    const promise1 = eventual.click;
    handler(5);
    const value1 = await promise1;
    const promise2 = eventual.click;
    expect(promise2).to.not.equal(promise1);
    const value2 = await Promise.race([ promise2, delay(10) ]);
    expect(value2).to.be.undefined;
  })
  it('should create promises that can be chained', async function() {
    const [ on, eventual ] = manageEvents();
    const handler1 = on.click();
    const handler2 = on.keypress();
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
  it('should issue warning about lack of action when warning is set to true', async function() {
    // TODO
  })
  it('should throw when more than one parameters are passed to handler-building function', function() {
    // TODO
  })
})
