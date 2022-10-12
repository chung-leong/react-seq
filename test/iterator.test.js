import { expect } from 'chai';
import { delay, Interruption } from '../index.js';

import {
  extendDelay,
  TimedIterator,
  TimedPropsIterator,
} from '../src/iterator.js';

describe('#extendDelay()', function() {
  it ('should set the delay multiplier and addend', function() {
    extendDelay(10, 200);
    const iterator = new TimedIterator();
    iterator.setDelay(3);
    expect(iterator.delay).to.equal((3 + 200) * 10);
    extendDelay();
  })
})

describe('#TimedPropsIterator', function() {
  it('should resolve props that are promises', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, {});
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World' });
  })
  it('should ignore props that are regular values', async function() {
    const props = {
      hello: 'Hello',
      world: delay(20).then(() => 'World'),
      cats: 5,
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, {});
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', cats: 5 });
  })
  it('should retrieve items from async generator', async function() {
    const create = async function*() {
      await delay(10);
      yield 'Cow';
      await delay(10);
      yield 'Pig';
      await delay(10);
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
      animals: create(),
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, {});
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
  })
  it('should retrieve items from sync generator', async function() {
    const create = function*() {
      yield 'Cow';
      yield 'Pig';
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
      animals: create(),
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, {});
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
  })
  it('should permit props marked as usable', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, { world: true });
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(2);
    expect(list[0]).to.eql({ hello: 'Hello', world: null });
    expect(list[1]).to.eql({ hello: 'Hello', world: 'World' });
  })
  it('should deem array of certain length as usable', async function() {
    const create = async function*() {
      await delay(10);
      yield 'Cow';
      await delay(10);
      yield 'Pig';
      await delay(10);
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
      animals: create(),
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, { animals: arr => arr.length >= 2 });
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        duplicateArrays(value);
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(2);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig' ] });
    expect(list[1]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
  })
  it('should retrieve items from multiple generators', async function() {
    const create = async function*() {
      await delay(10);
      yield 'Cow';
      await delay(10);
      yield 'Pig';
      await delay(10);
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
      animals: create(),
      names: create(),
    };
    const iterator = new TimedPropsIterator();
    iterator.start(props, { animals: arr => arr.length >= 2 });
    const list = [];
    for (;;) {
      const { value, done } = await iterator.next();
      if (value) {
        duplicateArrays(value);
        list.push(value);
      } else if (done) {
        break;
      }
    }
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({
      hello: 'Hello',
      world: 'World',
      animals: [ 'Cow', 'Pig', 'Chicken' ],
      names: [ 'Cow', 'Pig', 'Chicken' ]
    });
  })
})

function duplicateArrays(props) {
  for (const [ name, value ] of Object.entries(props)) {
    if (value instanceof Array) {
      props[name] = value.slice();
    }
  }
}
