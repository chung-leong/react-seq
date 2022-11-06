import { expect } from 'chai';
import { noConsole } from './error-handling.js';
import { delay } from '../index.js';

import {
  Inspector,
} from '../index.js';

describe('#Inspector', function() {
  it('should yield a promise that is fulfilled when a matching event shows up', async function() {
    const inspector = new Inspector();
    const promise = inspector.occurrence(evt => evt.type === 'update');
    inspector.dispatch({ type: 'resolve' });
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    inspector.dispatch({ type: 'update' });
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.have.property('type', 'update');
  })
  it('should allow use of an object as the predicate', async function() {
    const inspector = new Inspector();
    const promise = inspector.occurrence({ type: 'update' });
    inspector.dispatch({ type: 'resolve' });
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    inspector.dispatch({ type: 'update' });
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.have.property('type', 'update');
  })
  it('should reject with error from predicate function', async function() {
    const inspector = new Inspector();
    const promise = inspector.occurrence(evt => { throw new Error('Error') });
    inspector.dispatch({ type: 'resolve' });
    await expect(promise).to.eventually.be.rejected;
  })
  it('should match every event use when occurence with no parameter', async function() {
    const inspector = new Inspector();
    const promise = inspector.occurrence();
    inspector.dispatch({ type: 'resolve' });
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.have.property('type', 'resolve');
  })
  it('should throw when occurrence is given invalid argument', function() {
    const inspector = new Inspector();
    expect(() => inspector.occurrence(5)).to.throw();
  })
  it('should call onEvent', async function() {
    let event;
    class TestInspector extends Inspector {
      onEvent(evt) {
        event = evt;
      }
    }
    const inspector = new TestInspector();
    inspector.dispatch({ type: 'resolve' });
    expect(event).to.have.property('type', 'resolve');
  })
  it('should dump errors encountered in onEvent to console', async function() {
    const { error } = await noConsole(async () => {
      class TestInspector extends Inspector {
        onEvent(evt) {
          throw new Error('error');
        }
      }
      const inspector = new TestInspector();
      inspector.dispatch({ type: 'resolve' });
    });
    expect(error).to.be.an('error');
  })
})
