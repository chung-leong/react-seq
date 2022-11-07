import { expect } from 'chai';
import { noConsole } from './error-handling.js';
import { delay, throwing } from '../index.js';
import { EventManager } from '../src/event-manager.js';

import {
  Inspector,
  Logger,
} from '../index.js';

describe('#Inspector', function() {
  it('should call onEvent', async function() {
    let event;
    class TestLogger extends Inspector {
      onEvent(evt) {
        event = evt;
      }
    }
    const inspector = new TestLogger();
    inspector.dispatch({ type: 'resolve' });
    expect(event).to.have.property('type', 'resolve');
  })
})

describe('#Logger', function() {
  it('should yield a promise that is fulfilled when a matching event shows up', async function() {
    const inspector = new Logger();
    const promise = inspector.event(evt => evt.type === 'update');
    inspector.dispatch({ type: 'resolve' });
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    inspector.dispatch({ type: 'update' });
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.have.property('type', 'update');
  })
  it('should allow use of an object as the predicate', async function() {
    const inspector = new Logger();
    const promise = inspector.event({ type: 'update' });
    inspector.dispatch({ type: 'resolve' });
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    inspector.dispatch({ type: 'update' });
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.have.property('type', 'update');
  })
  it('should reject with error from predicate function', async function() {
    const inspector = new Logger();
    const promise = inspector.event(evt => { throw new Error('Error') });
    inspector.dispatch({ type: 'resolve' });
    await expect(promise).to.eventually.be.rejected;
  })
  it('should match every event use when oldEvents called no parameter', async function() {
     const inspector = new Logger();
     inspector.dispatch({ type: 'resolve' });
     inspector.dispatch({ type: 'update' });
     inspector.dispatch({ type: 'explode' });
     const list = inspector.oldEvents();
     expect(list.map(e => e.type)).to.eql([ 'resolve', 'update', 'explode' ]);
   })
  it('should throw when event is given invalid argument', function() {
    const inspector = new Logger();
    expect(() => inspector.event(5)).to.throw();
  })
  it('should ignore old events when newEvent is called', async function() {
    const inspector = new Logger();
    inspector.dispatch({ type: 'update' });
    const promise = inspector.newEvent(evt => evt.type === 'update');
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
  it('should return old events when oldEvents is called', async function() {
    const inspector = new Logger();
    inspector.dispatch({ type: 'update' });
    inspector.dispatch({ type: 'await' });
    inspector.dispatch({ type: 'update' });
    inspector.dispatch({ type: 'await' });
    const result = inspector.oldEvents({ type: 'update' });
    expect(result).to.have.lengthOf(2);
    expect(result.map(e => e.type)).to.eql([ 'update', 'update' ]);
  })
  it('should dump errors encountered in onEvent to console', async function() {
    const { error } = await noConsole(async () => {
      class TestLogger extends Logger {
        onEvent(evt) {
          throw new Error('error');
        }
      }
      const inspector = new TestLogger();
      inspector.dispatch({ type: 'resolve' });
    });
    expect(error).to.be.an('error');
  })
  it('should quit waiting for event after some time', async function() {
    const inspector = new Logger();
    const promise = inspector.event({ type: 'await' }, 10);
    await expect(promise).to.eventually.be.rejected;
  })
  it('should receive notification from event manage when an await occurs', async function() {
    const inspector = new Logger();
    const { on, eventual } = new EventManager({ inspector });
    await eventual.click.for(10).milliseconds;
    const evt = await inspector.event({ type: 'await' }, 100);
    expect(evt).to.have.property('type', 'await');
  })
  it('should receive notification from event manage when awaiting multiple events', async function() {
    const inspector = new Logger();
    const { on, eventual } = new EventManager({ inspector });
    await eventual.click.or.keyPress.for(10).milliseconds;
    const list = inspector.oldEvents({ type: 'await' });
    expect(list).to.have.lengthOf(2);
    expect(list.map(e => e.name)).to.eql([ 'click', 'keyPress' ]);
  })
  it('should receive notification from event manage when an handler is called', async function() {
    const inspector = new Logger();
    const { on, eventual } = new EventManager({ inspector });
    on.click('hello');
    setTimeout(async () => {
      try {
        await eventual.click;
      } catch (err) {
      }
    }, 10);
    setTimeout(() => {
      on.click(throwing('Bad'));
    }, 20);
    const evt1 = await inspector.event({ type: 'fulfill' }, 100);
    const evt2 = await inspector.event({ type: 'reject' }, 100);
    expect(evt1).to.eql({ type: 'fulfill', name: 'click', value: 'hello', handled: false });
    expect(evt2).to.have.property('handled', true);
  })
  it('should be able to trigger fulfillment of promise', async function() {
    const inspector = new Logger();
    const { on, eventual } = new EventManager({ inspector });
    const promise = eventual.click;
    promise.then(() => {});
    const evt = await inspector.event({ type: 'await' }, 100);
    evt.resolve('Hello');
    const result = await promise;
    expect(result).to.equal('Hello');
  })
  it('should be able to trigger rejection of promise', async function() {
    const inspector = new Logger();
    const { on, eventual } = new EventManager({ inspector });
    const promise = eventual.click;
    // this is done mostly for code coverage purpose as await doesn't call catch()
    let error;
    promise.catch((err) => {
      error = err;
    });
    setTimeout(async () => await promise, 0);
    const evt = await inspector.newEvent({ type: 'await' }, 100);
    evt.reject(new Error('Error'));
    await expect(promise).to.eventually.be.rejected;
    expect(error).to.be.an('error');
  })
})
