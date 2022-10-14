import { expect } from 'chai';
import { delay, Interruption } from '../index.js';

import {
  generateProps,
} from '../src/progressive.js';

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
    duplicateArrays(value);
    list.push(value);
  }
  return list;
}

function duplicateArrays(props) {
  for (const [ name, value ] of Object.entries(props)) {
    if (value instanceof Array) {
      props[name] = value.slice();
    }
  }
}
