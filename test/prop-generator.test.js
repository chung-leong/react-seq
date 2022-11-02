import { expect } from 'chai';
import { createSteps, loopThrough } from './step.js';
import { noConsole } from './error-handling.js';
import { delay } from '../index.js';

import {
  generateNext,
} from '../src/prop-generator.js';
import {
  generateProps,
} from '../index.js';

describe('#generateNext()', function() {
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
    debugger;
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
  it('should return promised values from sync generator', async function() {
    const source = g(
      p(1), p(2), p(3), p(4), p(5), p(6)
    );
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
    let gStart = 0, aStart = 0;
    let gFinal = 0, aFinal = 0;
    function* g(...values) {
      try {
        gStart++;
        for (const value of values) {
          yield value;
        }
      } finally {
        gFinal++;
      }
    }

    async function* a(...values) {
      try {
        aStart++;
        for (const value of values) {
          yield value;
        }
      } finally {
        aFinal++;
      }
    }

    const source = p(g(
      a(1, p(2)),
      a(3, 4),
      g(p(5), 6),
    ));
    const generator = generateNext(source);
    await generator.next();
    await generator.return();
    expect(gFinal).to.equal(gStart);
    expect(aFinal).to.equal(aStart);
  })
  it ('should throw an error when a the generate encounters one', async function() {
    const source = p(a(
      a(1, p(2)),
      a(3, Promise.reject(new Error)),
      g(p(5), 6), // the promise will cause a break here between the two numbers
    ));
    const generator = generateNext(source);
    const list = [];
    let error;
    try {
      for await (const value of generator) {
        list.push(value);
      }
    } catch (err) {
      error = err;
    }
    expect(list).to.eql([
      [ 1 ],
      [ 1, 2 ],
      [ 1, 2, 3 ],
    ]);
    expect(error).to.be.an('error');
  })
})

describe('#generateProps()', function() {
  it('should resolve props that are promises', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(5).then(() => 'World'),
    };
    const generator = generateProps(props, {});
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World' });
  })
  it('should ignore props that are regular values', async function() {
    const props = {
      hello: 'Hello',
      world: delay(5).then(() => 'World'),
      cats: 5,
    };
    const generator = generateProps(props, {});
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', cats: 5 });
  })
  it('should retrieve items from async generator', async function() {
    const steps = createSteps();
    const createAnimals = async function*() {
      await steps[0];
      yield 'Cow';
      await steps[2];
      yield 'Pig';
      await steps[3];
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createAnimals(),
    };
    await loopThrough(steps, 5, async () => {
      const generator = generateProps(props, {});
      const list = await getList(generator);
      expect(list).to.have.lengthOf(1);
      expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
    });
  })
  it('should retrieve items from sync generator', async function() {
    const createAnimals = function*() {
      yield 'Cow';
      yield 'Pig';
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(5).then(() => 'World'),
      animals: createAnimals(),
    };
    const generator = generateProps(props, {});
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
  })
  it('should permit props marked as usable', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(5).then(() => 'World'),
    };
    const generator = generateProps(props, { world: true });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(2);
    expect(list[0]).to.eql({ hello: 'Hello', world: undefined });
    expect(list[1]).to.eql({ hello: 'Hello', world: 'World' });
  })
  it('should deem array of certain length as usable', async function() {
    const steps = createSteps();
    const createAnimals = async function*() {
      await steps[0];
      yield 'Cow';
      await steps[2];
      yield 'Pig';
      await steps[3];
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createAnimals(),
    };
    await loopThrough(steps, 5, async () => {
      const generator = generateProps(props, { animals: 2 });
      const list = await getList(generator);
      expect(list).to.have.lengthOf(2);
      expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig' ] });
      expect(list[1]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
    });
  })
  it('should call a function to determine usability', async function() {
    const steps = createSteps();
    const createAnimals = async function*() {
      await steps[0];
      yield 'Cow';
      await steps[2];
      yield 'Pig';
      await steps[3];
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createAnimals(),
    };
    function checkArray(arr, props) {
      expect(props).to.have.property('hello');
      expect(props).to.have.property('world');
      expect(props).to.have.property('animals');
      return arr.length >= 2;
    }
    await loopThrough(steps, 5, async () => {
      const generator = generateProps(props, { animals: checkArray });
      const list = await getList(generator);
      expect(list).to.have.lengthOf(2);
      expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig' ] });
      expect(list[1]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
    });
  })
  it('should accept number as usability for non-array', async function() {
    const steps = createSteps();
    const createAnimals = async function*() {
      await steps[0];
      yield 'Cow';
      await steps[2];
      yield 'Pig';
      await steps[3];
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createAnimals(),
    };
    await loopThrough(steps, 5, async () => {
      const generator = generateProps(props, { world: 1, animals: 0 });
      const list = await getList(generator);
      expect(list).to.have.lengthOf(3);
      expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow' ] });
      expect(list[1]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig' ] });
      expect(list[2]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
    });
  })
  it('should return an array even when usability criteria cannot be met', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createAnimals = async function*() {
      await steps[0];
      yield 'Cow';
      await steps[2];
      yield 'Pig';
      await steps[3];
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createAnimals(),
    };
    await loopThrough(steps, 5, async() => {
      const generator = generateProps(props, { animals: Infinity });
      const list = await getList(generator);
      expect(list).to.have.lengthOf(1);
      expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
    });
  })
  it('should yield initial state when usability for all props is 0', async function() {
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(5).then(() => 'World'),
    };
    const generator = generateProps(props, { hello: 0, world: 0 });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(3);
    expect(list[0]).to.eql({ hello: undefined, world: undefined });
    expect(list[1]).to.eql({ hello: 'Hello', world: undefined });
    expect(list[2]).to.eql({ hello: 'Hello', world: 'World' });
  })
  it('should retrieve items from multiple generators', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createAnimals = async function*() {
      await steps[0];
      yield 'Cow';
      await steps[2];
      yield 'Pig';
      await steps[3];
      yield 'Chicken';
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createAnimals(),
      names: createAnimals(),
    };
    await loopThrough(steps, 5, async() => {
      const generator = generateProps(props, { animals: 2 });
      const list = await getList(generator);
      expect(list).to.have.lengthOf(1);
      expect(list[0]).to.eql({
        hello: 'Hello',
        world: 'World',
        animals: [ 'Cow', 'Pig', 'Chicken' ],
        names: [ 'Cow', 'Pig', 'Chicken' ]
      });
    });
  })
  it('should merge items from multiple generators into single list', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createNumbers = async function*() {
      await steps[1];
      yield [ 1, 2, 3 ].values();
      await steps[2];
      yield [ 4, 5, 6 ].values();
      await steps[3];
      yield [ 7, 8, 9 ].values();
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[0].then(() => 'World'),
      animals: createNumbers(),
    };
    await loopThrough(steps, 5, async () => {
      const generator = generateProps(props, {});
      const list = await getList(generator);
      expect(list).to.have.lengthOf(1);
      expect(list[0]).to.eql({
        hello: 'Hello',
        world: 'World',
        animals: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
      });
    });
  })
  it('should throw an error when a prop\'s generator encounters one', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createNumbers = async function*() {
      await steps[0];
      yield [ 1, 2, 3 ].values();
      await steps[2];
      yield [ 4, 5, Promise.reject(new Error) ].values();
      await steps[3];
      yield [ 7, 8, 9 ].values();
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createNumbers(),
    };
    await loopThrough(steps, 5, async () => {
      const generator = generateProps(props, { world: true, animals: true });
      const list = [];
      let error;
      try {
        for await (const state of generator) {
          list.push(state);
        }
      } catch (err) {
        error = err;
      }
      expect(list).to.eql([
        { hello: 'Hello', world: undefined, animals: undefined },
        { hello: 'Hello', world: undefined, animals: [ 1, 2, 3 ] },
        { hello: 'Hello', world: 'World', animals: [ 1, 2, 3 ] },
      ]);
      expect(error).to.be.an('error');
    });
  })
  it('should send error that happens in finally section of generator to console', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createNumbers = async function*() {
      try {
        await steps[0];
        yield [ 1, 2, 3 ].values();
        await steps[2];
        yield [ 4, 5, 5 ].values();
        await steps[3];
        yield [ 7, 8, 9 ].values();
      } finally {
        throw new Error('What the...?');
      }
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: steps[1].then(() => 'World'),
      animals: createNumbers(),
    };
    await loopThrough(steps, 5, async () => {
      const results = await noConsole(async () => {
        const generator = generateProps(props, { world: true, animals: true });
        const list = [];
        let error;
        try {
          for await (const state of generator) {
            list.push(state);
            generator.return(); // terminate after grabbing the first one
          }
        } catch (err) {
          error = err;
        }
        expect(error).to.be.undefined;
      });
      expect(results.error).to.be.an('error');
      expect(results.error.message).to.contain('What the...');
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
