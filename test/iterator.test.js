import { expect } from 'chai';
import { delay } from '../index.js';

import {
  extendDeferment,
  limitDeferment,
  IntermittentIterator,
  Interruption,
  Timeout,
} from '../src/iterator.js';

describe('#extendDeferment()', function() {
  it('should set the delay multiplier', function() {
    extendDeferment(10);
    const iterator = new IntermittentIterator();
    iterator.setDelay(3);
    expect(iterator.delay).to.equal(3 * 10);
    extendDeferment();
  })
})

describe('#IntermittentIterator()', function() {
  it('should alternate between returning value and interruption where delay is 0', async function() {
    const iterator = new IntermittentIterator();
    const create = async function*() {
      await delay(30);
      yield 'Whiskey drink';
      await delay(10);
      yield 'Vodka drink';
      await delay(10);
      yield 'Lager drink';
      await delay(10);
      yield 'Cider drink';
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
    expect(results).to.have.lengthOf(8);
    expect(results[0]).to.equal('Whiskey drink');
    expect(results[1]).to.be.instanceOf(Interruption);
    expect(results[2]).to.equal('Vodka drink');
    expect(results[3]).to.be.instanceOf(Interruption);
    expect(results[4]).to.equal('Lager drink');
    expect(results[5]).to.be.instanceOf(Interruption);
    expect(results[6]).to.equal('Cider drink');
    expect(results[7]).to.be.instanceOf(Interruption);
  })
  it('should throw interruption intermittently', async function() {
    const iterator = new IntermittentIterator();
    iterator.setDelay(25);
    const create = async function*() {
      await delay(20);
      yield 'Whiskey drink';    // 20ms
      await delay(10);
      yield 'Vodka drink';      // 30ms
      await delay(30);          // 45ms interruption (20 + 25)
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
          results.push(err);
        } else {
          throw err;
        }
      }
    }
    await iterator.return();
    expect(results[0]).to.equal('Whiskey drink');
    expect(results[1]).to.equal('Vodka drink');
    expect(results[2]).to.be.instanceOf(Interruption);
    expect(results[3]).to.equal('Lager drink');
    expect(results[4]).to.be.instanceOf(Interruption);
    expect(results[5]).to.equal('Cider drink');
  })
  it('should allow alteration of delay interval half way', async function() {
    const iterator = new IntermittentIterator();
    iterator.setDelay(25);
    const create = async function*() {
      await delay(25);
      yield 'Whiskey drink';    // 25ms
      await delay(10);
      yield 'Vodka drink';      // 35ms
      await delay(20);          // 50ms interruption
      yield 'Lager drink';      // 55ms
      await delay(10);
      yield 'Cider drink';      // 65ms
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
    expect(results[1]).to.equal('Vodka drink');
    expect(results[2]).to.be.instanceOf(Interruption);
    expect(results[3]).to.equal('Lager drink');
    expect(results[4]).to.equal('Cider drink');
    expect(results[5]).to.equal('Whiskey drink');
    expect(results[6]).to.equal('Vodka drink');
    expect(results[7]).to.equal('Lager drink');
    expect(results[8]).to.be.instanceOf(Interruption);
    expect(results[9]).to.equal('Cider drink');
  })
  it('should invoke finally section of generator', async function() {
    const iterator = new IntermittentIterator();
    iterator.setDelay(25);
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
    const iterator = new IntermittentIterator();
    iterator.setDelay(30, 40);
    let finalized = false;
    const create = async function*() {
      try {
        await delay(50);          // 40ms timeout
        yield 'Whiskey drink';    // 50ms
        await delay(10);
        yield 'Vodka drink';      // 60ms
        await delay(20);          // 70ms interruption
        yield 'Lager drink';      // 80ms
        await delay(10);
        yield 'Cider drink';      // 70ms
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
    expect(results[0]).to.be.instanceOf(Timeout);
    expect(results[1]).to.equal('Whiskey drink');
    expect(results[2]).to.equal('Vodka drink');
    expect(results[3]).to.be.instanceOf(Interruption);
    expect(results[4]).to.equal('Lager drink');
    expect(results[5]).to.equal('Cider drink');
    expect(finalized).to.be.true;
  })
  it('should not swallow errors from generator', async function() {
    const iterator = new IntermittentIterator();
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
