import { expect } from 'chai';
import { renderToPipeableStream } from 'react-dom/server';
import { createWriteStream } from 'fs';
import MemoryStream from 'memorystream';
import { create } from 'react-test-renderer';
import { createElement, Suspense, Component } from 'react';
import { createSteps, loopThrough } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { delay, Abort } from '../index.js';

import {
  sequential,
  useSequential,
  extendDeferment,
} from '../index.js';

describe('#sequential()', function() {
  it('should return a Suspense element', function() {
    const el = sequential(async function*({ fallback }) {
      fallback('Cow');
      yield 'Pig';
    });
    expect(el).to.have.property('type', Suspense);
  })
  it('should return a component that uses the first item from the generator as its content', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test() {
      const seq = useSequential();
      return seq();
    }
    const el = sequential(async function*({ fallback }) {
      fallback('Cow');
      await assertions[0];
      yield 'Pig';
      steps[1].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
  })
  it('should return a component that defers rendering', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ fallback, defer }) {
      fallback('Cow');
      defer(20);
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      yield 'Chicken';
      steps[2].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Cow');
    await delay(25);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that displays new contents intermittently', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ defer }) {
      defer(20)
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      yield 'Duck';
      steps[2].done();
      await assertions[2];
      yield 'Chicken';
      steps[3].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal(null);
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal(null);
    await delay(25);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Pig');
    await delay(25);
    expect(renderer.toJSON()).to.equal('Duck');
    assertions[2].done();
    await steps[3];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should allow deferrment to be turned off midway', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ defer }) {
      defer(10)
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      defer(0);
      yield 'Duck';
      steps[2].done();
      await assertions[2];
      yield 'Chicken';
      steps[3].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal(null);
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal(null);
    await delay(15);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Duck');
    assertions[2].done();
    await steps[3];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that eventually shows the final item from the generator', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*() {
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      yield 'Chicken';
      steps[2].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal(null);
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that uses fallback', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ fallback, defer }) {
      fallback('Cow');
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      yield 'Chicken';
      steps[2].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should allow management of events using promises', async function() {
    const steps = createSteps(), assertions = createSteps();
    let triggerClick;
    const el = sequential(async function*({ fallback, manageEvents }) {
      fallback('Cow');
      const [ on, eventual ] = manageEvents();
      triggerClick = on.click;
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      await eventual.click;
      yield 'Chicken';
      steps[2].done();
      await assertions[2];
      await eventual.click;
      yield 'Rocky';
      steps[3].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await delay(10);
    // should be the same still as it's still waiting for the click
    expect(renderer.toJSON()).to.equal('Pig');
    triggerClick();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
    assertions[2].done();
    await delay(10);
    // ditto
    expect(renderer.toJSON()).to.equal('Chicken');
    triggerClick();
    await steps[3];
    expect(renderer.toJSON()).to.equal('Rocky');
  })
  it('should terminate iteration when component is unmounted mid-cycle', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ fallback }) {
      fallback('Cow');
      try {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
        await assertions[2];
        yield 'Rocky';
        steps[3].done();
        await assertions[3];
        cats.push('Rocky');
        steps[4].done('end');
      } finally {
        steps[5].done('finally');
      }
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
    renderer.unmount();
    assertions[2].done();
    expect(renderer.toJSON()).to.equal(null);
    assertions[3].done();
    assertions[4].done();
    const result = await Promise.race([ steps[4], steps[5] ]);
    expect(result).to.equal('finally');
  })
  it('should cause all event promises to reject on unmount', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ fallback, manageEvents }) {
      fallback('Cow');
      const [ on, eventual ] = manageEvents();
      try {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        await eventual.click.or.keypress;
        yield 'Chicken';
        steps[2].done();
        await assertions[2];
        await eventual.click;
        yield 'Rocky';
        steps[3].done('end');
      } finally {
        steps[4].done('finally');
      }
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await delay(5);
    renderer.update(null);
    expect(renderer.toJSON()).to.equal(null);
    const result = await Promise.race([ steps[3], steps[4] ]);
    expect(result).to.equal('finally');
  })
  it('should render timeout content when time limit is breached', async function() {
    const steps = createSteps(), assertions = createSteps();
    const el = sequential(async function*({ defer, fallback, timeout }) {
      defer(10, 10);
      fallback('Cow');
      timeout(async () => 'Tortoise');
      await assertions[0];
      yield 'Pig';
      steps[1].done();
    });
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal('Cow');
    await delay(15);
    expect(renderer.toJSON()).to.equal('Tortoise');
    assertions[0].done();
  })
  it('should allow creation of a suspending component', async function() {
    const steps = createSteps(5), assertions = createSteps();
    const el = sequential(async function*({ suspend }) {
      suspend();
      await assertions[0];
      yield 'Pig';
      steps[1].done();
      await assertions[1];
      yield 'Chicken';
      steps[2].done();
    });
    const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
    const renderer = create(suspense);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    await delay(100);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should allow a container component to return a suspending component', async function() {
    // NOTE: test renderer does not accurately simulate this scenario
    const steps = createSteps(5), assertions = createSteps();
    function Creator() {
      return sequential(async function*({ suspend }) {
        suspend('#112');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
    }
    const el = createElement(Creator);
    const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
    const renderer = create(suspense);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    await delay(100);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should trigger error boundary', async function() {
    await noConsole(async () => {
      const el = sequential(async function*({ fallback }) {
        fallbak('Cow'); // typo causing the function to throw
        yield createElement('div', {}, cat); // also an undeclared variable here
      });
      const boundary = createErrorBoundary(el);
      const renderer = create(boundary);
      await delay(5);
      expect(caughtAt(boundary)).to.be.an('error');
    });
  })
  it('should trigger error boundary after a yield', async function() {
    const steps = createSteps(), assertions = createSteps();
    await noConsole(async () => {
      const el = sequential(async function*({ fallback }) {
        fallback('Cow');
        await assertions[0];
        yield createElement('div', {}, 'Pig');
        steps[1].done();
        await dely(10); // <-- typo
        yield createElement('div', {}, cat);
      });
      const boundary = createErrorBoundary(el);
      const renderer = create(boundary);
      expect(renderer.toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      await delay(0);
      expect(caughtAt(boundary)).to.be.an('error');
    });
  })
  it('should use delay multiplier', async function() {
    const steps = createSteps(), assertions = createSteps();
    extendDeferment(10);
    const el = sequential(async function*({ defer }) {
      defer(10);
      await assertions[0];
      yield 'Duck';
      steps[1].done();
      await assertions[1];
      yield 'Chicken';
      steps[2].done();
    })
    extendDeferment(1);
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal(null);
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal(null);
    await delay(25);
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
  })
  it('should render correctly to a stream', async function() {
    const el = sequential(async function*({ fallback, defer }) {
      fallback(createElement('div', {}, 'Cow'));
      defer(100);
      await delay(5);
      yield createElement('div', {}, 'Pig');
      await delay(5);
      yield createElement('div', {}, 'Chicken');
      await delay(5);
      yield createElement('div', {}, 'Rocky');
    });
    const stream = await new Promise((resolve, reject) => {
      const stream = renderToPipeableStream(el, {
        onShellError: reject,
        onError: reject,
        onAllReady: () => resolve(stream),
      });
    });
    const text = await readStream(stream);
    expect(text).to.contain('<div>Rocky</div>')
  })
  skip.if(!global.gc).
  it('should not leak memory', async function() {
    this.timeout(5000);
    async function step() {
      const el = sequential(async function*({ fallback }) {
        fallback(createElement('div', {}, 'Cow'));
        await delay(0);
        yield createElement('div', {}, 'Pig');
        await delay(10);
        yield createElement('div', {}, 'Chicken');
        await delay(10);
        yield createElement('div', {}, 'Rocky');
      });
      const stream = await new Promise((resolve, reject) => {
        const stream = renderToPipeableStream(el, {
          onShellError: reject,
          onError: reject,
          onAllReady: () => resolve(stream),
        });
      });
      const outStream = createWriteStream('/dev/null');
      stream.pipe(outStream);
      await new Promise(resolve => outStream.on('finish', resolve));
    }
    async function test() {
      for (let i = 0; i < 500; i++) {
        await step();
      }
    }

    // establish base-line memory usage first
    await test();
    // perform garbage collection
    gc();
    const before = process.memoryUsage().heapUsed;
    await test();
    // a bit of time for timer to finish
    await delay(100);
    // perform initiate garbage collection again
    gc();
    const after = process.memoryUsage().heapUsed;
    const diff = Math.round((after - before) / 1024);
    expect(diff).to.not.be.above(0);
  })
})

describe('#useSequential()', function() {
  it('should recreate element when dependencies change', async function() {
    const steps = createSteps(), assertions = createSteps();
    const cats = [];
    function Test({ cat }) {
      return useSequential(async function*({ fallback, defer }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield cat;
        steps[2].done();
        await assertions[2];
        cats.push(cat);
        steps[3].done();
      }, [ cat ]);
    }
    const el1 = createElement(Test, { cat: 'Rocky' });
    const renderer = create(el1);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    const el2 = createElement(Test, { cat: 'Barbie' });
    renderer.update(el2);
    expect(renderer.toJSON()).to.equal('Cow');
    await delay(5);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Barbie');
    assertions[2].done();
    await steps[3];
    expect(cats).to.eql([ 'Barbie' ]); // first generator was terminated before reaching end
  })
  it('should recreate generator when dependencies are not specified', async function() {
    const steps = createSteps(), assertions = createSteps();
    const cats = [];
    function Test({ cat }) {
      return useSequential(async function*({ fallback, defer }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield cat;
        steps[2].done();
        await assertions[2];
        cats.push(cat);
        steps[3].done();
      });
    }
    const el1 = createElement(Test, { cat: 'Rocky' });
    const renderer = create(el1);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    const el2 = createElement(Test, { cat: 'Barbie' });
    renderer.update(el2);
    expect(renderer.toJSON()).to.equal('Cow');
    await delay(5);
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Barbie');
    assertions[2].done();
    await steps[3];
    expect(cats).to.eql([ 'Barbie' ]); // first generator was terminated before reaching end
  })
  it('should not recreate generator when dependencies has not changed', async function() {
    const steps = createSteps(), assertions = createSteps();
    const cats = [];
    function Test({ cat, dog }) {
      return useSequential(async function*({ fallback, defer }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield cat;
        steps[2].done();
        await assertions[2];
        cats.push(cat);
        steps[3].done();
      }, [ cat ]);
    }
    const el1 = createElement(Test, { cat: 'Rocky', dog: 'Dingo' });
    const renderer = create(el1);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Rocky');
    const el2 = createElement(Test, { cat: 'Rocky', dog: 'Pi' });
    renderer.update(el2);
    assertions[2].done();
    await steps[3];
    expect(cats).to.eql([ 'Rocky' ]);
  })
  it('should terminate iteration when dependencies change mid-cycle', async function() {
    const steps = createSteps(), assertions = createSteps();
    const cats = [], finalized = [];
    function Test({ cat }) {
      return useSequential(async function*({ fallback, defer }) {
        fallback('Cow');
        try {
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          yield cat;
          steps[3].done();
          await assertions[3];
          cats.push(cat);
          steps[4].done('end');
        } finally {
          finalized.push(cat);
          steps[5].done('finally');
        }
      });
    }
    const renderer = create(createElement(Test, { cat: 'Rocky' }));
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    const el2 = createElement(Test, { cat: 'Barbie' });
    renderer.update(el2);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
    assertions[2].done();
    await steps[3];
    expect(renderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([]);
    assertions[3].done();
    await steps[4];
    expect(cats).to.eql([ 'Barbie' ]);
    expect(finalized).to.eql([ 'Rocky', 'Barbie' ]);
  })
  it('should cause all event promises to reject on prop change', async function() {
    const steps = createSteps(), assertions = createSteps();
    const cats = [], finalized = [], errors = [];
    let triggerClick, triggerKeyPress;
    function Test({ cat }) {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        triggerClick = on.click;
        triggerKeyPress = on.keypress;
        try {
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          await eventual.click.and.keypress;
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          await eventual.click;
          yield cat;
          steps[3].done();
          await assertions[3];
          cats.push(cat);
          steps[4].done();
        } catch (err) {
          errors.push(err);
          throw err;
        } finally {
          finalized.push(cat);
        }
      }, [ cat ]);
    }
    const el1 = createElement(Test, { cat: 'Rocky' });
    const renderer = create(el1);
    expect(renderer.toJSON()).to.equal('Cow');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Pig');
    assertions[1].done();
    await delay(5); // ensure that the component get a chance to await on click and keypress
    const el2 = createElement(Test, { cat: 'Barbie' });
    renderer.update(el2);
    expect(renderer.toJSON()).to.equal('Cow');
    await delay(5);
    expect(renderer.toJSON()).to.equal('Pig');
    triggerClick();
    await delay(10);
    expect(renderer.toJSON()).to.equal('Pig');    // no change--still waiting for keypress
    triggerKeyPress();
    await steps[2];
    expect(renderer.toJSON()).to.equal('Chicken');
    assertions[2].done();
    await delay(10);
    expect(renderer.toJSON()).to.equal('Chicken');  // no change--still waiting for click
    triggerClick();
    await steps[3];
    expect(renderer.toJSON()).to.equal('Barbie');
    assertions[3].done();
    await steps[4];
    expect(cats).to.eql([ 'Barbie' ]);
    expect(errors[0]).to.be.an.instanceOf(Abort);
    expect(finalized).to.eql([ 'Rocky', 'Barbie' ]);
  })
})

async function readStream(stream) {
  const memStream = new MemoryStream;
  stream.pipe(memStream);
  await new Promise(resolve => memStream.once('finish', resolve));
  const data = memStream.read(Infinity);
  const string = data.toString();
  memStream.destroy();
  return string;
}

process.on('warning', function() {
  console.log('ERROR');
});
