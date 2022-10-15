import { expect } from 'chai';
import { delay, Interruption } from '../index.js';

import {
  generateNext,
  generateProps,
} from '../src/progressive.js';

describe('#generateNext()', function() {
  function p(value) {
    return Promise.resolve(value);
  }

  function* g(...values) {
    for (const value of values) {
      yield value;
    }
  }

  async function* a(...values) {
    for (const value of values) {
      yield value;
    }
  }

  it('should return fulfillment value of promise', async function() {
    const source = p(123);
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([ 123 ]);
  })
  it('should return fulfillment value of multilevel promise', async function() {
    const source = p(p(p(123)));
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([ 123 ]);
  })
  it('should return values from async generator', async function() {
    const source = a(1, 2, 3);
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([
      [ 1 ],
      [ 1, 2 ],
      [ 1, 2, 3 ],
    ]);
  })
  it('should return values from sync generator', async function() {
    const source = g(1, 2, 3);
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([
      [ 1, 2, 3 ],
    ]);
  })
  it('should return values from promise of promise of an async generator', async function() {
    const source = p(p(a(1, 2, 3)));
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([
      [ 1 ],
      [ 1, 2 ],
      [ 1, 2, 3 ],
    ]);
  })
  it('should return values from multiple async generators', async function() {
    const source = g(
      a(1, 2),
      a(3, 4),
      g(5, 6),
    );
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([
      [ 1 ],
      [ 1, 2 ],
      [ 1, 2, 3 ],
      [ 1, 2, 3, 4 ],
      [ 1, 2, 3, 4, 5, 6 ],
    ]);
  })
  it('should return promised values from generators', async function() {
    const source = p(a(
      a(1, p(2)),
      a(3, 4),
      g(p(5), 6), // the promise will cause a break here between the two numbers
    ));
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(list).to.eql([
      [ 1 ],
      [ 1, 2 ],
      [ 1, 2, 3 ],
      [ 1, 2, 3, 4 ],
      [ 1, 2, 3, 4, 5 ],
      [ 1, 2, 3, 4, 5, 6 ],
    ]);
  })
  it('should run finally sections of generators', async function() {
    let gCount = 0, aCount = 0;
    function* g(...values) {
      try {
        for (const value of values) {
          yield value;
        }
      } finally {
        gCount++;
      }
    }

    async function* a(...values) {
      try {
        for (const value of values) {
          yield value;
        }
      } finally {
        aCount++;
      }
    }

    const source = p(g(
      a(1, p(2)),
      a(3, 4),
      g(p(5), 6),
    ));
    const generator = generateNext(source);
    const list = await getList(generator);
    expect(gCount).to.equal(2);
    expect(aCount).to.equal(2);
  })
})

describe('#generateProps()', function() {
  it('should resolve props that are promises', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
    };
    const generator = generateProps(props, {});
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World' });
  })
  it('should ignore props that are regular values', async function() {
    const props = {
      hello: 'Hello',
      world: delay(20).then(() => 'World'),
      cats: 5,
    };
    const generator = generateProps(props, {});
    const list = await getList(generator);
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
    const generator = generateProps(props, {});
    const list = await getList(generator);
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
    const generator = generateProps(props, {});
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
  })
  it('should permit props marked as usable', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
    };
    const generator = generateProps(props, { world: true });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(2);
    expect(list[0]).to.eql({ hello: 'Hello', world: undefined });
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
    const generator = generateProps(props, { animals: arr => arr.length >= 2 });
    const list = await getList(generator);
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
    const generator = generateProps(props, { animals: arr => arr.length >= 2 });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({
      hello: 'Hello',
      world: 'World',
      animals: [ 'Cow', 'Pig', 'Chicken' ],
      names: [ 'Cow', 'Pig', 'Chicken' ]
    });
  })
})

async function getList(generator) {
  const list = [];
  for await (const value of generator) {
    list.push(value);
  }
  return list;
}
