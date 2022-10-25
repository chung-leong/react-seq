import { expect } from 'chai';
import sinon from 'sinon';
import { createElement, Component } from 'react';
import { create, act } from 'react-test-renderer';
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
    const generator = generateProps(props, { animals: 2 });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(2);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig' ] });
    expect(list[1]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
  })
  it('should return an array when usability criteria cannot be met', async function() {
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
    const generator = generateProps(props, { animals: Infinity });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({ hello: 'Hello', world: 'World', animals: [ 'Cow', 'Pig', 'Chicken' ] });
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
    const generator = generateProps(props, { animals: 2 });
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({
      hello: 'Hello',
      world: 'World',
      animals: [ 'Cow', 'Pig', 'Chicken' ],
      names: [ 'Cow', 'Pig', 'Chicken' ]
    });
  })
  it('should merge items from multiple generators into single list', async function() {
    const create = async function*() {
      await delay(10);
      yield [ 1, 2, 3 ].values();
      await delay(10);
      yield [ 4, 5, 6 ].values();
      await delay(10);
      yield [ 7, 8, 9 ].values();
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
      animals: create(),
    };
    const generator = generateProps(props, {});
    const list = await getList(generator);
    expect(list).to.have.lengthOf(1);
    expect(list[0]).to.eql({
      hello: 'Hello',
      world: 'World',
      animals: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
    });
  })
  it ('should throw an error when a prop\'s generator encounters one', async function() {
    const create = async function*() {
      await delay(10);
      yield [ 1, 2, 3 ].values();
      await delay(30);
      yield [ 4, 5, Promise.reject(new Error) ].values();
      await delay(10);
      yield [ 7, 8, 9 ].values();
    };
    const props = {
      hello: Promise.resolve('Hello'),
      world: delay(20).then(() => 'World'),
      animals: create(),
    };
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
      { hello: 'Hello', world: undefined, animals: [] },
      { hello: 'Hello', world: undefined, animals: [ 1, 2, 3 ] },
      { hello: 'Hello', world: 'World', animals: [ 1, 2, 3 ] },
    ]);
    expect(error).to.be.an('error');
  })

})

describe('#progressive', function() {
  it('should return a component that renders progressively', async function () {
    function TestComponent({ animals }) {
      return animals.join(', ');
    }

    async function* generate() {
      yield 'Pig';
      await delay(10);
      yield 'Donkey';
      await delay(10);
      yield 'Chicken';
    }

    const el = progressive(({ fallback, type, usable }) => {
      fallback('None');
      type(TestComponent);
      usable({
        animals: 1
      });
      return { animals: generate() };
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(5);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey, Chicken');
  })
  it('should defer rendering until all items is fetched from generator', async function () {
    function TestComponent({ animals }) {
      return animals.join(', ');
    }

    async function* generate() {
      yield 'Pig';
      await delay(10);
      yield 'Donkey';
      await delay(10);
      yield 'Chicken';
    }

    const el = progressive(({ fallback, type }) => {
      fallback('None');
      type(TestComponent);
      return { animals: generate() };
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(5);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey, Chicken');
  })
  it('should rendering with available data when deferrment delay is reached', async function () {
    function TestComponent({ animals }) {
      return animals.join(', ');
    }

    async function* generate() {
      yield 'Pig';
      await delay(20);
      yield 'Donkey';
      await delay(20);
      yield 'Chicken';
    }

    const el = progressive(({ fallback, type, defer, usable }) => {
      type(TestComponent);
      fallback('None');
      defer(15);
      usable({ animals: 1 })
      return { animals: generate() };
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(25);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey');
    await delay(20);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey, Chicken');
  })
  it('should trigger error boundary when a generator throws', async function () {
    function TestComponent({ animals = [] }) {
      return animals.join(', ');
    }

    async function* generate() {
      await delay(20);
      yield 'Pig';
      await delay(30);
      throw new Error('Error');
      yield 'Donkey';
      await delay(20);
      yield 'Chicken';
    }

    let error;
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(err) {
        error = err;
        return { error: err };
      }
      render() {
        const { error } = this.state;
        if (error) {
          return error.message;
        }
        return this.props.children;
      }
    }
    const stub = sinon.stub(console, 'error');
    try {
      const el = progressive(({ fallback, usable, type }) => {
        fallback('None');
        type(TestComponent);
        usable({ animals: true });
        return { animals: generate() };
      });
      const testRenderer = create(createElement(ErrorBoundary, {}, el));
      await delay(10);
      expect(testRenderer.toJSON()).to.equal('None');
      await delay(20);
      expect(testRenderer.toJSON()).to.equal('Pig');
      await delay(25);
      expect(testRenderer.toJSON()).to.equal('Error');
      expect(error).to.be.an('error');
    } finally {
      stub.restore();
    }
  })
  it('should accept a module with default as type', async function() {
    async function* generate() {
      yield 'Pig';
      await delay(20);
      yield 'Donkey';
      await delay(20);
      yield 'Chicken';
    }

    function Title({ animals = [] }) {
      return createElement('h1', {}, animals.join(', '));
    }

    const el = progressive(({ fallback, usable, type }) => {
      fallback('None');
      type({ default: Title });
      usable({ animals: true });
      return { animals: generate() };
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(10);
    expect(testRenderer.toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig' ] });
    await delay(25);
    expect(testRenderer.toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig, Donkey' ] });
    await delay(30);
    expect(testRenderer.toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig, Donkey, Chicken' ] });
  })
  it('should accept an element-creating function in lieu of a type', async function() {
    async function* generate() {
      yield 'Pig';
      await delay(20);
      yield 'Donkey';
      await delay(20);
      yield 'Chicken';
    }

    const el = progressive(({ fallback, usable, element }) => {
      fallback('None');
      usable({ animals: true });
      element(({ animals = [] }) => createElement('span', {}, animals.join(', ')));
      return { animals: generate() };
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(10);
    expect(testRenderer.toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig' ] });
    await delay(25);
    expect(testRenderer.toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig, Donkey' ] });
    await delay(30);
    expect(testRenderer.toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig, Donkey, Chicken' ] });
  })
  it('should progressively render values from sync generator', async function() {
    function TestComponent({ animals = [] }) {
      return animals.join(', ');
    }

    function* generate() {
      yield Promise.resolve('Pig');
      yield delay(20).then(() => 'Donkey');
      yield delay(40).then(() => 'Chicken');
    }

    const el = progressive(({ fallback, usable, type }) => {
      fallback('None');
      type(TestComponent);
      usable({ animals: true });
      return { animals: generate() };
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('None');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(25);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig, Donkey, Chicken');
  })
  it('should throw if an element type is not given', async function() {
    let error;
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(err) {
        error = err;
        return { error: err };
      }
      render() {
        const { error } = this.state;
        if (error) {
          return createElement('h1', {}, error.message);
        }
        return this.props.children;
      }
    }
    const stub = sinon.stub(console, 'error');
    try {
      const el = progressive(() => {
        return {};
      });
      const testRenderer = create(createElement(ErrorBoundary, {}, el));
      await delay(50);
      expect(error).to.be.an('error');
    } finally {
      stub.restore();
    }
  })
  it('should throw if usable is given a non-object', async function() {
    let error;
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(err) {
        error = err;
        return { error: err };
      }
      render() {
        const { error } = this.state;
        if (error) {
          return createElement('h1', {}, error.message);
        }
        return this.props.children;
      }
    }
    const stub = sinon.stub(console, 'error');
    try {
      const el = progressive(({ usable }) => {
        usable('cow', 1);
        return {};
      });
      const testRenderer = create(createElement(ErrorBoundary, {}, el));
      await delay(50);
      expect(error).to.be.an('error');
    } finally {
      stub.restore();
    }
  })
  it('should throw if function returns a non-object', async function() {
    let error;
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(err) {
        error = err;
        return { error: err };
      }
      render() {
        const { error } = this.state;
        if (error) {
          return createElement('h1', {}, error.message);
        }
        return this.props.children;
      }
    }
    const stub = sinon.stub(console, 'error');
    try {
      const el = progressive(({ element }) => {
        element((props) => 'Hello');
        return 123;
      });
      const testRenderer = create(createElement(ErrorBoundary, {}, el));
      await delay(50);
      expect(error).to.be.an('error');
    } finally {
      stub.restore();
    }
  })
})

async function getList(generator) {
  const list = [];
  for await (const value of generator) {
    list.push(value);
  }
  return list;
}
