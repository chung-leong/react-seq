import { expect } from 'chai';
import { createSteps, loopThrough } from './step.js';
import { delay, Abort } from '../index.js';

import {
  extendDelay,
  limitTimeout,
  IntermittentIterator,
  Interruption,
  Timeout,
} from '../src/iterator.js';

describe('#extendDelay()', function() {
  it('should set the delay multiplier', function() {
    extendDelay(10);
    const iterator = new IntermittentIterator({});
    iterator.setDelay(3);
    expect(iterator.delay).to.equal(3 * 10);
    extendDelay(1);
    iterator.setDelay(3);
    expect(iterator.delay).to.equal(3);
  })
})

describe('#limitTimeout()', function() {
  it('should limit the time limit for the first item', function() {
    limitTimeout(999);
    const iterator = new IntermittentIterator({});
    iterator.setLimit(Infinity);
    expect(iterator.limit).to.equal(999);
    limitTimeout(Infinity);
    iterator.setLimit(100000);
    expect(iterator.limit).to.equal(100000);
  })
})

describe('#IntermittentIterator()', function() {
  it('should throw interruption intermittently', async function() {
    const iterator = new IntermittentIterator({});
    iterator.setDelay(25);
    const create = async function*() {
      await delay(20);
      yield 'Whiskey drink';    // 20ms
      await delay(10);          // 25ms interruption
      yield 'Vodka drink';      // 30ms
      await delay(30);          // 50ms interruption
      yield 'Lager drink';      // 60ms
      await delay(30);          // 70ms interruption
      yield 'Cider drink';      // 80ms
    };
    const results = [];
    iterator.start(create());
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          results.push(value);
        } else {
          break;
        }
      } catch (err) {
        if (err instanceof Interruption) {
          debugger;
          results.push(err);
        } else {
          throw err;
        }
      }
    }
    await iterator.return();
    expect(results[0]).to.equal('Whiskey drink');
    expect(results[1]).to.be.instanceOf(Interruption);
    expect(results[2]).to.equal('Vodka drink');
    expect(results[3]).to.be.instanceOf(Interruption);
    expect(results[4]).to.equal('Lager drink');
    expect(results[5]).to.be.instanceOf(Interruption);
    expect(results[6]).to.equal('Cider drink');
  })
  it('should allow alteration of delay interval half way', async function() {
    const iterator = new IntermittentIterator({});
    iterator.setDelay(25);
    const create = async function*() {
      await delay(15);
      yield 'Whiskey drink';    // 15ms
      await delay(20);          // 25ms interruption
      yield 'Vodka drink';      // 35ms
      await delay(30);          // 50ms interruption
      yield 'Lager drink';      // 65ms
      await delay(20);          // 75ms interruption
      yield 'Cider drink';      // 85ms
      iterator.setDelay(40);
      await delay(10);
      yield 'Whiskey drink';    // 10ms
      await delay(10);
      yield 'Vodka drink';      // 20ms
      await delay(10);
      yield 'Lager drink';      // 30ms
      await delay(30);          // 40ms interruption
      yield 'Cider drink';      // 60ms
    };
    const results = [];
    iterator.start(create());
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          results.push(value);
        } else {
          break;
        }
      } catch (err) {
        if (err instanceof Interruption) {
          results.push(err);
        } else {
          throw err;
        }
      }
    }
    await iterator.return();
    expect(results[0]).to.equal('Whiskey drink');
    expect(results[1]).to.be.instanceOf(Interruption);
    expect(results[2]).to.equal('Vodka drink');
    expect(results[3]).to.be.instanceOf(Interruption);
    expect(results[4]).to.equal('Lager drink');
    expect(results[5]).to.be.instanceOf(Interruption);
    expect(results[6]).to.equal('Cider drink');
    expect(results[7]).to.equal('Whiskey drink');
    expect(results[8]).to.equal('Vodka drink');
    expect(results[9]).to.equal('Lager drink');
    expect(results[10]).to.be.instanceOf(Interruption);
    expect(results[11]).to.equal('Cider drink');
  })
  it('should allow alteration of limit half way', async function() {
    const iterator = new IntermittentIterator({});
    iterator.setDelay(35);
    iterator.setLimit(100);
    const create = async function*() {
      await delay(100);
    };
    setTimeout(() => {
      iterator.setDelay(80);
      iterator.setLimit(20);
    }, 10);
    const results = [];
    iterator.start(create());
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          results.push(value);
        } else {
          break;
        }
      } catch (err) {
        if (err instanceof Interruption || err instanceof Timeout) {
          results.push(err);
        } else {
          throw err;
        }
      }
    }
    await iterator.return();
    expect(results[0]).to.be.instanceOf(Timeout);
  })

  it('should invoke finally section of generator', async function() {
    const iterator = new IntermittentIterator({});
    iterator.setDelay(25);
    iterator.setLimit(1000);
    let finalized = false;
    const create = async function*() {
      try {
        await delay(30);          // 25ms interruption
        yield 'Whiskey drink';    // 30ms
        await delay(10);
        yield 'Vodka drink';      // 40ms
        await delay(20);          // 50ms interruption
        yield 'Lager drink';      // 60ms
        await delay(10);
        yield 'Cider drink';      // 70ms
      } finally {
        finalized = true;
      }
    };
    iterator.start(create());
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        // stop immediately
        break;
      } catch (err) {
        if (!(err instanceof Interruption)) {
          throw err;
        }
      }
    }
    await iterator.return();
    expect(finalized).to.be.true;
  })
  it('should emit Timeout error when limit is exceeded', async function() {
    const iterator = new IntermittentIterator({});
    iterator.setDelay(30);
    iterator.setLimit(40);
    let finalized = false;
    const create = async function*() {
      try {
        await delay(50);          // 30ms timeout
                                  // 40ms interruption
        yield 'Whiskey drink';    // 50ms
        await delay(20);          // 60ms interruption
        yield 'Vodka drink';      // 70ms
        await delay(35);          // 90ms interruption
        yield 'Lager drink';      // 95ms
        await delay(10);
        yield 'Cider drink';      // 105ms
      } finally {
        finalized = true;
      }
    };
    const results = [];
    iterator.start(create());
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        if (!done) {
          results.push(value);
        } else {
          break;
        }
      } catch (err) {
        if (err instanceof Interruption || err instanceof Timeout) {
          results.push(err);
        } else {
          throw err;
        }
      }
    }
    await iterator.return();
    expect(results[0]).to.be.instanceOf(Interruption);
    expect(results[1]).to.be.instanceOf(Timeout);
    expect(results[2]).to.equal('Whiskey drink');
    expect(results[3]).to.be.instanceOf(Interruption);
    expect(results[4]).to.equal('Vodka drink');
    expect(results[5]).to.be.instanceOf(Interruption);
    expect(results[6]).to.equal('Lager drink');
    expect(results[7]).to.equal('Cider drink');
    expect(finalized).to.be.true;
  })
  it('should stop iteration when abort controller signals', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const iterator = new IntermittentIterator({ signal });
    iterator.setDelay(25);
    let finalized = false;
    const create = async function*() {
      try {
        await delay(30);          // 10ms abort
        yield 'Whiskey drink';    // never reached
        await delay(10);
        yield 'Vodka drink';
        await delay(20);
        yield 'Lager drink';
        await delay(10);
        yield 'Cider drink';
      } finally {
        finalized = true;
      }
    };
    iterator.start(create());
    setTimeout(() => abortController.abort(), 10);
    const results = [];
    let error;
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        results.push(value);
      } catch (err) {
        if (err instanceof Abort) {
          error = err;
          break;
        } else if (!(err instanceof Interruption)) {
          throw err;
        }
      }
    }
    await iterator.return();
    await delay(20);
    expect(results).to.have.lengthOf(0);
    expect(error).to.be.instanceOf(Abort);
    expect(finalized).to.be.true;
  })
  it('should not swallow errors from generator', async function() {
    const iterator = new IntermittentIterator({});
    iterator.setDelay(25);
    let finalized = false;
    const create = async function*() {
      try {
        await delay(30);
        yield 'Whiskey drink';
        await delay(10);
        yield 'Vodka drink';
        throw new Error('I get knocked down');
      } finally {
        finalized = true;
      }
    };
    const results = [];
    let error;
    iterator.start(create());
    for (;;) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          break;
        }
      } catch (err) {
        if (!(err instanceof Interruption)) {
          error = err;
          break;
        }
      }
    }
    await iterator.return();
    expect(finalized).to.be.true;
    expect(error).to.be.instanceOf(Error);
  })
})
