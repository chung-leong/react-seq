import { expect } from 'chai';
import { html } from 'htm/react';
import { Suspense } from 'react';
import { create, act } from 'react-test-renderer';
import { delay } from '../src/utils.js';

import {
  useSequence,
} from '../src/sequence.js';

describe('#useSequence()', function() {
  it('should return a function', function() {
    let f;
    function Test() {
      f = useSequence();
      return 'Hello';
    }
    const testRenderer = create(html`<${Test} />`);
    expect(f).to.be.instanceOf(Function);
    expect(testRenderer.toJSON()).to.equal('Hello');
  })
  it('should return a component that uses the first item from the generator as its content', async function() {
    function Test() {
      const seq = useSequence();
      return seq(async function *({ fallback }) {
        fallback('Cow');
        yield 'Pig';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
  })
  it('should return a component that defers rendering', async function() {
    const stoppage = createStoppage();
    function Test() {
      const seq = useSequence({ delay: 50 });
      return seq(async function *({ fallback }) {
        fallback('Cow');
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that displays new contents intermittently', async function() {
    const stoppage = createStoppage();
    function Test() {
      const seq = useSequence({ delay: 50 });
      return seq(async function *() {
        yield 'Pig';
        await delay(70);
        yield 'Duck';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(50);
    expect(testRenderer.toJSON()).to.equal('Duck');
    stoppage.resolve();
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that eventually shows the final item from the generator', async function() {
    const stoppage = createStoppage();
    function Test() {
      const seq = useSequence({ delay: 20 });
      return seq(async function *({ fallback }) {
        fallback('Cow');
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that uses fallback', async function() {
    const stoppage = createStoppage();
    function Test() {
      const seq = useSequence({ delay: 20 });
      return seq(async function *({ fallback }) {
        fallback('Cow');
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should recreate generator when dependencies change', async function() {
    const cats = [];
    const iterations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 }, [ cat ]);
      return seq(async function *({ fallback, iteration }) {
        fallback('Cow');
        delay(10);
        yield 'Pig';
        delay(10);
        yield cat;
        cats.push(cat);
        iterations.push(iteration);
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Rocky', 'Barbie' ]);
    expect(iterations).to.eql([ 0, 1 ]);
  })
  it('should recreate generator when dependencies are not specified', async function() {
    const cats = [];
    const iterations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 });
      return seq(async function *({ fallback, iteration }) {
        fallback('Cow');
        delay(10);
        yield 'Pig';
        delay(10);
        yield cat;
        cats.push(cat);
        iterations.push(iteration);
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Rocky', 'Barbie' ]);
    expect(iterations).to.eql([ 0, 1 ]);
  })
  it('should not recreate generator when dependencies has not changed', async function() {
    const cats = [];
    const iterations = [];
    function Test({ cat, dog }) {
      const seq = useSequence({ delay: 20 }, [ cat ]);
      return seq(async function *({ fallback, iteration }) {
        fallback('Cow');
        delay(10);
        yield 'Pig';
        delay(10);
        yield cat;
        cats.push(cat);
        iterations.push(iteration);
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" dog="Dingo" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(html`<${Test} cat="Rocky" dog="Pi" />`);
    });
    await delay(30);
    expect(cats).to.eql([ 'Rocky' ]);
    expect(iterations).to.eql([ 0 ]);
  })
  it('should terminate iteration when dependencies change mid-cycle', async function() {
    const stoppage = createStoppage();
    const cats = [];
    const iterations = [];
    const finalizations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 });
      return seq(async function *({ fallback, iteration }) {
        fallback('Cow');
        try {
          delay(10);
          yield 'Pig';
          await stoppage;
          yield cat;
          cats.push(cat);
          iterations.push(iteration);
        } finally {
          finalizations.push(cat);
        }
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    stoppage.resolve();
    await delay(20);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Barbie' ]);
    expect(iterations).to.eql([ 0 ]);
    expect(finalizations).to.eql([ 'Rocky', 'Barbie' ]);
  })
})

function createStoppage(delay = 500) {
  let r;
  const promise = new Promise((resolve, reject) => r = [ resolve, reject ]);
  promise.resolve = r[0];
  promise.reject = r[1];
  // prevent failed test from stalling the test script
  setTimeout(() => { promise.reject(new Error(`Timeout`)); }, delay);
  return promise;
}
