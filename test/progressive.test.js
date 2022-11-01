import { expect } from 'chai';
import { createElement } from 'react';
import { withTestRenderer } from './test-renderer.js';
import { createSteps, loopThrough } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { delay } from '../index.js';

import {
  generateNext,
  generateProps,
  progressive,
  useProgressive,
} from '../index.js';

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

describe('#progressive', function() {
  it('should return a component that renders progressively', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      function TestComponent({ animals }) {
        return animals.join(', ');
      }
      const { element: el, abortManager } = progressive(async ({ fallback, type, usable }) => {
        fallback('None');
        type(TestComponent);
        usable({
          animals: 1
        });
        return { animals: generate() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig, Donkey');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should defer rendering until all items is fetched from generator', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      function TestComponent({ animals }) {
        return animals.join(', ');
      }
      const { element: el, abortManager } = progressive(async ({ fallback, type }) => {
        fallback('None');
        type(TestComponent);
        return { animals: generate() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('None');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should rendering with available data when deferrment delay is reached', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      function TestComponent({ animals }) {
        return animals.join(', ');
      }
      const { element: el, abortManager } = progressive(async ({ fallback, type, defer, usable }) => {
        type(TestComponent);
        fallback('None');
        defer(15);
        usable({ animals: 1 })
        return { animals: generate() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      assertions[1].done();
      await steps[2];
      await delay(25);
      expect(toJSON()).to.equal('Pig, Donkey');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should trigger error boundary when a generator throws', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        steps[2].throw(new Error('Error'));
      }
      function TestComponent({ animals = [] }) {
        return animals.join(', ');
      }
      await noConsole(async () => {
        const { element: el, abortManager } = progressive(async ({ fallback, usable, type }) => {
          fallback('None');
          type(TestComponent);
          usable({ animals: true });
          return { animals: generate() };
        });
        abortManager.unschedule();
        const boundary = createErrorBoundary(el);
        create(boundary);
        expect(toJSON()).to.equal('None');
        assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('Pig');
        assertions[1].done();
        await steps[2];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should accept a module with default as type', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      function Title({ animals = [] }) {
        return createElement('h1', {}, animals.join(', '));
      }
      const { element: el, abortManager } = progressive(async ({ fallback, usable, type }) => {
        fallback('None');
        type({ default: Title });
        usable({ animals: true });
        return { animals: generate() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig' ] });
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig, Donkey' ] });
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig, Donkey, Chicken' ] });
    });
  })
  it('should accept an element-creating function in lieu of a type', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      const { element: el, abortManager } = progressive(async ({ fallback, usable, element }) => {
        fallback('None');
        usable({ animals: true });
        element(({ animals = [] }) => createElement('span', {}, animals.join(', ')));
        return { animals: generate() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig' ] });
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig, Donkey' ] });
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig, Donkey, Chicken' ] });
    });
  })
  it('should progressively render values from sync generator', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(0), assertions = createSteps();
      function* generate() {
        yield assertions[0].then(() => {
          steps[1].done();
          return 'Pig';
        });
        yield assertions[1].then(() => {
          steps[2].done();
          return 'Donkey';
        });
        yield assertions[2].then(() => {
          steps[3].done();
          return 'Chicken';
        });
      }
      function TestComponent({ animals = [] }) {
        return animals.join(', ');
      }
      const { element: el, abortManager } = progressive(async ({ fallback, usable, type }) => {
        fallback('None');
        type(TestComponent);
        usable({ animals: true });
        return { animals: generate() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig, Donkey');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should throw if an element type is not given', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      await noConsole(async () => {
        const { element: el, abortManager } = progressive(async () => {
          return {};
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should throw if both type and element are used', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON }) => {
      await noConsole(async () => {
        const { element: el1 } = progressive(async ({ element, type }) => {
          type('div');
          element('Hello');
          return {};
        });
        const boundary1 = createErrorBoundary(el1);
        await create(boundary1);
        expect(caughtAt(boundary1)).to.be.an('error');
        unmount();

        const { element: el2 } = progressive(async ({ element, type }) => {
          element('Hello');
          type('div');
          return {};
        });
        const boundary2 = createErrorBoundary(el2);
        await create(boundary2);
        expect(caughtAt(boundary2)).to.be.an('error');
      });
    });
  })
  it('should throw if usable is given a non-object', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await noConsole(async () => {
        const { element: el, abortManager } = progressive(async ({ usable }) => {
          usable('cow', 1);
          return {};
        });
        abortManager.unschedule();
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(caughtAt(boundary)).to.be.an('error');
      })
    });
  })
  it('should throw if function returns a non-object', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await noConsole(async () => {
        const { element: el, abortManager } = progressive(async ({ element }) => {
          element((props) => 'Hello');
          return 123;
        });
        abortManager.unschedule();
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should accept number as usablility default', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* create1() {
        await assertions[0];
        yield 'Pig';              // 1
        steps[1].done();
        await assertions[2];
        yield 'Cow';              // 3
        steps[3].done();
        await assertions[4];
        yield 'Chicken';
      }
      async function* create2() {
        await assertions[1];
        yield 'Cuban';            // 2
        steps[2].done();
        await assertions[3];
        yield 'Hamburger';        // 4
        steps[4].done();
        await assertions[5];
        yield 'Chicken sandwich';
      }

      const { element: el, abortManager } = progressive(async ({ element, usable, fallback }) => {
        fallback('None');
        usable(2);
        element(({ animals, sandwiches }) => `${animals.join(', ')} (${sandwiches.join(', ')})`);
        return { animals: create1(), sandwiches: create2() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('None');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('None');
      assertions[3].done()
      await steps[4];
      expect(toJSON()).to.equal('Pig, Cow (Cuban, Hamburger)');
      assertions[4].done()
    });
  })
  it('should let usable override the default for one prop', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* create1() {
        await assertions[0];
        yield 'Pig';              // 1
        steps[1].done();
        await assertions[2];
        yield 'Cow';              // 3
        steps[3].done();
        await assertions[4];
        yield 'Chicken';
      }
      async function* create2() {
        await assertions[1];
        yield 'Cuban';            // 2
        steps[2].done();
        await assertions[3];
        yield 'Hamburger';        // 4
        steps[4].done();
        await assertions[5];
        yield 'Chicken sandwich';
      }

      const { element: el, abortManager } = progressive(async ({ element, usable, fallback }) => {
        fallback('None');
        usable(0);
        usable({ sandwiches: 1 })
        element(({ animals, sandwiches }) => `${animals.join(', ')} (${sandwiches.join(', ')})`);
        return { animals: create1(), sandwiches: create2() };
      });
      abortManager.unschedule();
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig (Cuban)');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Cow (Cuban)');
      assertions[3].done()
      await steps[4];
      expect(toJSON()).to.equal('Pig, Cow (Cuban, Hamburger)');
      assertions[4].done()
    });
  });
})

describe('#useProgressive()', function() {
  it('should return a component that renders progressively', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      function ContainerComponent() {
        return useProgressive(async ({ fallback, type, usable }) => {
          fallback('None');
          type(TestComponent);
          usable({
            animals: 1
          });
          return { animals: generate() };
        }, []);
      }
      function TestComponent({ animals }) {
        return animals.join(', ');
      }
      const el = createElement(ContainerComponent);
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig, Donkey');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should use a dynamically loaded module', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      async function* generate() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Donkey';
        steps[2].done();
        await assertions[2];
        yield 'Chicken';
        steps[3].done();
      }
      function ContainerComponent() {
        return useProgressive(async ({ fallback, type, usable }) => {
          fallback('None');
          type(await import('./components/JSONDump.js'));
          usable({
            animals: 1
          });
          return { animals: generate() };
        }, []);
      }
      const el = createElement(ContainerComponent);
      create(el);
      expect(toJSON()).to.equal('None');
      assertions[0].done();
      await steps[1];
      expect(JSON.parse(toJSON())).to.eql({ animals: [ 'Pig' ] });
      assertions[1].done();
      await steps[2];
      expect(JSON.parse(toJSON())).to.eql({ animals: [ 'Pig', 'Donkey' ] });
      assertions[2].done();
      await steps[3];
      expect(JSON.parse(toJSON())).to.eql({ animals: [ 'Pig', 'Donkey', 'Chicken' ] });
    });
  })
  it('should warn when loaded module does not have a default export', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function ContainerComponent() {
        return useProgressive(async ({ type }) => {
          await assertions[0];
          type(await import('./components/Empty.js'));
          steps[1].done();
          return {};
        }, []);
      }
      const el = createElement(ContainerComponent);
      const result = await noConsole(async () => {
        create(el);
        expect(JSON.parse(toJSON())).to.eql(null);
        assertions[0].done();
        await steps[1];
      });
      expect(result.warn).to.contain('default');
    });
  })
  it('should warn when type is given a promise', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function ContainerComponent() {
        return useProgressive(async ({ type }) => {
          await assertions[0];
          type(import('./components/Empty.js'));
          steps[1].done();
          return {};
        }, []);
      }
      const el = createElement(ContainerComponent);
      const result = await noConsole(async () => {
        create(el);
        expect(JSON.parse(toJSON())).to.eql(null);
        assertions[0].done();
        await steps[1];
      });
      expect(result.warn).to.contain('await');
    });
  })
  it('should warn when usability is specified for a prop that does not appear in the return object', async function () {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function ContainerComponent() {
        return useProgressive(async ({ type, usable }) => {
          usable({ b: 1, c: 2 });
          await assertions[0];
          type(await import('./components/JSONDump.js'));
          steps[1].done();
          return { a: 1 };
        }, []);
      }
      const el = createElement(ContainerComponent);
      const result = await noConsole(async () => {
        create(el);
        expect(JSON.parse(toJSON())).to.eql(null);
        assertions[0].done();
        await steps[1];
      });
      expect(result.warn).to.contain('prop');
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
