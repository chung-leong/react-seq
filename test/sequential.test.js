import { expect } from 'chai';
import { withTestRenderer } from './test-renderer.js';
import { withReactDOM } from './dom-renderer.js';
import { createElement, Suspense, Component, StrictMode } from 'react';
import { createSteps } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { createWriteStream } from 'fs';
import MemoryStream from 'memorystream';
import { renderToPipeableStream } from 'react-dom/server';
import { delay, Abort } from '../index.js';
import { isAbortError } from '../src/utils.js';

import {
  sequential,
  useSequential,
  extendDelay,
} from '../index.js';

describe('#sequential()', function() {
  it('should return a Suspense element', function() {
    const { element: el } = sequential(async function*({ fallback }) {
      fallback('Cow');
      yield 'Pig';
    });
    expect(el).to.have.property('type', Suspense);
  })
  it('should return a component that uses the first item from the generator as its content', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        const seq = useSequential();
        return seq();
      }
      const { element: el } = sequential(async function*({ fallback }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
      });
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
    });
  })
  it('should return a component that defers rendering', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ fallback, defer }) {
        fallback('Cow');
        defer(20);
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Cow');
      await delay(25);
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return a component that displays new contents intermittently', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ defer }) {
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
      create(el);
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      await delay(25);
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig');
      await delay(25);
      expect(toJSON()).to.equal('Duck');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return allow the generator function to retrieve the deferment delay and time limit', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ defer, timeout }) {
        yield `${defer()} ${timeout()}`;
      });
      await create(el);
      expect(toJSON()).to.equal('0 Infinity');
    });
  })
  it('should allow deferrment to be turned off midway', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ defer }) {
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
      create(el);
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      await delay(15);
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Duck');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return a component that eventually shows the final item from the generator', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      create(el);
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return a component that uses fallback', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ fallback, defer }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should allow fallback to be created by a callback function', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ fallback, defer }) {
        fallback(() => 'Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should throw when fallback is called after an await statement', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ fallback, defer }) {
        await assertions[0];
        setTimeout(() => steps[1].done(), 0);
        fallback('Cow');
        yield 'Pig';
        steps[2].done();
      });
      await noConsole(async () => {
        const boundary = createErrorBoundary(el);
        create(boundary);
        expect(toJSON()).to.equal(null);
        assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should throw when mount is called after an await statement', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ mount, defer }) {
        await assertions[0];
        setTimeout(() => steps[1].done(), 0);
        mount(() => {});
        yield 'Pig';
        steps[2].done();
      });
      await noConsole(async () => {
        const boundary = createErrorBoundary(el);
        create(boundary);
        expect(toJSON()).to.equal(null);
        assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should throw when mount is called with a non function', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const { element: el } = sequential(async function*({ mount, defer }) {
        mount('Rushmore');
      });
      await noConsole(async () => {
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should allow management of events using promises', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      let triggerClick;
      const { element: el } = sequential(async function*({ fallback, manageEvents }) {
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
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await delay(10);
      // should be the same still as it's still waiting for the click
      expect(toJSON()).to.equal('Pig');
      triggerClick();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      assertions[2].done();
      await delay(10);
      // ditto
      expect(toJSON()).to.equal('Chicken');
      triggerClick();
      await steps[3];
      expect(toJSON()).to.equal('Rocky');
    });
  })
  it('should terminate iteration when component is unmounted mid-cycle', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ fallback }) {
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
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      unmount();
      assertions[2].done();
      expect(toJSON()).to.equal(null);
      assertions[3].done();
      assertions[4].done();
      const result = await Promise.race([ steps[4], steps[5] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should render timeout content when time limit is breached', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ defer, fallback, timeout }) {
        defer(10);
        fallback('Cow');
        timeout(10, async () => 'Tortoise');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
      });
      create(el);
      expect(toJSON()).to.equal('Cow');
      await delay(15);
      expect(toJSON()).to.equal('Tortoise');
      assertions[0].done();
    });
  })
  it('should allow the timeout function to abort generator', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      let timeoutDuration;
      const { element: el } = sequential(async function*({ fallback, timeout }) {
        fallback('Cow');
        timeout(10, async ({ abort, limit }) => {
          timeoutDuration = limit;
          abort();
          return 'Tortoise';
        });
        try {
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done('end');
        } finally {
          await assertions[0];
          steps[3].done('finally');
        }
      });
      create(el);
      expect(toJSON()).to.equal('Cow');
      await delay(15);
      expect(toJSON()).to.equal('Tortoise');
      expect(timeoutDuration).to.equal(10);
      assertions[0].done();
      const results = await Promise.race([ steps[1], steps[3] ]);
      expect(results).to.equal('finally');
    });
  })
  it('should allow creation of a suspending component', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const { element: el } = sequential(async function*({ suspend }) {
        suspend();
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
      create(suspense);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      await delay(100);
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should throw when suspend and fallback are used at the same time', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON }) => {
      const { element: el1 } = sequential(async function*({ suspend, fallback }) {
        fallback('Cow')
        suspend();
        yield 'Chicken';
      });
      const { element: el2 } = sequential(async function*({ suspend, fallback }) {
        suspend();
        fallback('Cow')
        yield 'Chicken';
      });
      await noConsole(async () => {
        const boundary1 = createErrorBoundary(el1);
        await create(boundary1);
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary1)).to.be.an('error');
        unmount();

        const boundary2 = createErrorBoundary(el2);
        await create(boundary2);
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary2)).to.be.an('error');
      });
    });
  })
  it('should trigger error boundary', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await noConsole(async () => {
        const { element: el } = sequential(async function*({ fallback }) {
          fallbak('Cow'); // typo causing the function to throw
          yield createElement('div', {}, cat); // also an undeclared variable here
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should trigger error boundary after a yield', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      await noConsole(async () => {
        const { element: el } = sequential(async function*({ fallback }) {
          fallback('Cow');
          await assertions[0];
          yield createElement('div', {}, 'Pig');
          steps[1].done();
          await dely(10); // <-- typo
          yield createElement('div', {}, cat);
        });
        const boundary = createErrorBoundary(el);
        create(boundary);
        expect(toJSON()).to.equal('Cow');
        assertions[0].done();
        await steps[1];
        await delay(0);
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should use delay multiplier', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      extendDelay(10);
      const { element: el } = sequential(async function*({ defer }) {
        defer(10);
        await assertions[0];
        yield 'Duck';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      })
      extendDelay(1);
      create(el);
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      await delay(25);
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should render correctly to a stream', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const { element: el } = sequential(async function*({ fallback, defer }) {
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
    });
  })
  skip.entirely.if(!global.gc).
  it('should not leak memory', async function() {
    this.timeout(5000);
    async function step() {
      const { element: el } = sequential(async function*({ fallback }) {
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
    await withTestRenderer(async ({ create, update, toJSON }) => {
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
      create(el1);
      //expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Barbie');
      assertions[2].done();
      await steps[3];
      expect(cats).to.eql([ 'Barbie' ]); // first generator was terminated before reaching end
    });
  })
  it('should recreate generator when dependencies are not specified', async function() {
    await withTestRenderer(async ({ create, update, toJSON }) => {
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
      create(el1);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Barbie');
      assertions[2].done();
      await steps[3];
      expect(cats).to.eql([ 'Barbie' ]); // first generator was terminated before reaching end
    });
  })
  it('should not recreate generator when dependencies has not changed', async function() {
    await withTestRenderer(async ({ create, update, toJSON }) => {
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
      create(el1);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Rocky');
      const el2 = createElement(Test, { cat: 'Rocky', dog: 'Pi' });
      await update(el2);
      assertions[2].done();
      await steps[3];
      expect(cats).to.eql([ 'Rocky' ]);
    });
  })
  it('should terminate generator correctly if unmount occurs while fallback is being display', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test({ cat }) {
        return useSequential(async function*({ fallback, defer }) {
          fallback('Cow');
          try {
            await assertions[0];
            yield 'Pig';
            steps[1].done('end');
          } finally {
            steps[2].done('finally');
          }
        });
      }
      const el = createElement(Test, { cat: 'Rocky' });
      create(el);
      expect(toJSON()).to.equal('Cow');
      unmount();
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      const result = await Promise.race([ steps[1], steps[2] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should terminate iteration when dependencies change mid-cycle', async function() {
    await withTestRenderer(async ({ create, update, toJSON }) => {
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
      const el = createElement(Test, { cat: 'Rocky' });
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Barbie');
      expect(cats).to.eql([]);
      assertions[3].done();
      await steps[4];
      expect(cats).to.eql([ 'Barbie' ]);
      expect(finalized).to.eql([ 'Rocky', 'Barbie' ]);
    });
  })
  it('should cause all event promises to reject on unmount', async function() {
    await withTestRenderer(async ({ create, update, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        return useSequential(async function*({ fallback, manageEvents }) {
          fallback('Cow');
          const [ on, eventual ] = manageEvents();
          try {
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await eventual.click.or.keypress.and(assertions[1]);
            yield 'Chicken';
            steps[2].done();
            await eventual.click.and(assertions[2]);
            yield 'Rocky';
            steps[3].done('end');
          } finally {
            steps[4].done('finally');
          }
        });
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await update(null);
      expect(toJSON()).to.equal(null);
      const result = await Promise.race([ steps[3], steps[4] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should cause all event promises to reject on prop change', async function() {
    await withTestRenderer(async ({ create, update, toJSON }) => {
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
            await eventual.click.and.keypress.and(assertions[1]);
            yield 'Chicken';
            steps[2].done();
            await eventual.click.and(assertions[2]);
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
      create(el1);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[1];
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      triggerClick();
      await delay(10);
      expect(toJSON()).to.equal('Pig');    // no change--still waiting for keypress
      triggerKeyPress();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      assertions[2].done();
      await delay(10);
      expect(toJSON()).to.equal('Chicken');  // no change--still waiting for click
      triggerClick();
      await steps[3];
      expect(toJSON()).to.equal('Barbie');
      assertions[3].done();
      await steps[4];
      expect(cats).to.eql([ 'Barbie' ]);
      expect(errors[0]).to.be.an.instanceOf(Abort);
      expect(finalized).to.eql([ 'Rocky', 'Barbie' ]);
    });
  })
  it('should quietly shut down generator when an AbortError is encountered', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const abortController = new AbortController();
      const { signal } = abortController;
      let error;
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          try {
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await assertions[1];
            const res = await fetch('https://asddsd.asdasd.sd', { signal });
            steps[2].done('end');
          } catch (err) {
            error = err;
            throw err;
          } finally {
            steps[3].done('finally')
          }
        }, []);
      }
      const el = createElement(Test);
      const boundary = createErrorBoundary(el);
      create(boundary);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      abortController.abort();
      assertions[1].done();
      const result = await Promise.race([ steps[2], steps[3] ]);
      expect(result).to.equal('finally');
      expect(toJSON()).to.equal('Pig');
      expect(caughtAt(boundary)).to.be.undefined;
      expect(isAbortError(error)).to.be.true;
    });
  })
  it('should quietly shut down generator when an AbortError is encountered while fallback is still being displayed', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      const abortController = new AbortController();
      const { signal } = abortController;
      let error;
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          try {
            await assertions[0];
            const res = await fetch('https://asddsd.asdasd.sd', { signal });
            steps[1].done('end');
          } catch (err) {
            error = err;
            throw err;
          } finally {
            steps[2].done('finally')
          }
        }, []);
      }
      const el = createElement(Test);
      const boundary = createErrorBoundary(el);
      create(boundary);
      expect(toJSON()).to.equal('Cow');
      abortController.abort();
      assertions[0].done();
      const result = await Promise.race([ steps[1], steps[2] ]);
      expect(result).to.equal('finally');
      expect(toJSON()).to.equal(null);
      expect(caughtAt(boundary)).to.be.undefined;
      expect(isAbortError(error)).to.be.true;
    });
  })
  it('should allow a container component to return a suspending component', async function() {
    // NOTE: test renderer does not accurately simulate this scenario
    // since it doesn't recreate the state of the container element
    // upon unsuspension
    await withTestRenderer(async ({ create, update, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        return useSequential(async function*({ suspend }) {
          suspend('#112');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
        }, []);
      }
      const el = createElement(Test);
      const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
      create(suspense);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      // simulate the recreation of the container element for the sake
      // of code coverage
      await update(null);
      await update(suspense);
      // should immediately get the previously created component
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should correctly deal with undefined', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        return useSequential(async function*() {
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield undefined;
          steps[2].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal(null);
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should correctly deal with undefined as the initial non-fallback content', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          await assertions[0];
          yield undefined;
          steps[1].done();
          await assertions[1];
          yield 'Pig';
          steps[2].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should correctly deal with undefined as the timeout content', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        return useSequential(async function*({ fallback, timeout }) {
          fallback('Cow');
          timeout(20, () => undefined);
          await assertions[0];
          yield 'Monkey';
          steps[1].done();
          await assertions[1];
          yield 'Pig';
          steps[2].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      await delay(30);
      expect(toJSON()).to.equal(null);
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Monkey');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should update immediately when nothing occurred in the previous interruption', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      function Test() {
        return useSequential(async function*({ fallback, defer }) {
          fallback('Cow');
          defer(30);
          await delay(40);    // interruption
          yield 'Pig';        // 40ms
          await delay(20);
          yield 'Chicken';    // 60ms
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      await delay(45);
      expect(toJSON()).to.equal('Pig');
    });
  })
  it('should show previously pending content after flush is called', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      let f;
      function Test() {
        return useSequential(async function*({ fallback, defer, flush }) {
          f = flush;
          fallback('Cow');
          defer(Infinity);
          await assertions[0];
          yield 'Monkey';
          steps[1].done();
          await assertions[1];
          yield 'Pig';
          steps[2].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Cow');
      f();
      await delay(5);
      expect(toJSON()).to.equal('Monkey');
      assertions[1].done();
      await steps[2];
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should show previously pending content after initial item has been retrieved and flush is called', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      let f;
      function Test() {
        return useSequential(async function*({ fallback, defer, flush }) {
          f = flush;
          fallback('Cow');
          defer(0);
          await assertions[0];
          yield 'Monkey';
          steps[1].done();
          defer(Infinity);
          await assertions[1];
          yield 'Pig';
          steps[2].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Monkey');
      assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Monkey');
      f();
      await delay(5);
      expect(toJSON()).to.equal('Pig');
      assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  skip.if.dom.is.absent.or.not.in.development.mode.
  it('should work under strict mode', async function() {
    await withReactDOM(async ({ render, act, node }) => {
      // need to wrap calls to promise fulfilling calls to prevent
      // act() warnings; updates are caused by completion of assertions
      // so those are the steps where .done() uses act()
      // that effectively turn it into an async function
      const steps = createSteps(), assertions = createSteps(act);
      let call = 0;
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          steps[call].done();
          await assertions[call++];
          yield 'Monkey';
          steps[2].done();
          await assertions[2];
          yield 'Pig';
          steps[3].done();
          await assertions[3];
          yield 'Chicken';
          steps[4].done();
        }, []);
      }
      const el = createElement(Test);
      const strict = createElement(StrictMode, {}, el);
      await render(strict);
      // in strict mode a function passed to useMemo (used by useSequential) is run twice
      await steps[0];
      await steps[1];
      expect(node.textContent).to.equal('Cow');
      await assertions[0].done();
      await assertions[1].done();
      await steps[2];
      expect(node.textContent).to.equal('Monkey');
      await assertions[2].done();
      await steps[3];
      expect(node.textContent).to.equal('Pig');
      await assertions[3].done();
      await steps[4];
      expect(node.textContent).to.equal('Chicken');
    })
  })
  skip.if.dom.is.absent.or.not.in.development.mode.
  it('should run all finally sections under strict mode', async function() {
    await withReactDOM(async ({ render, act, node }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let call = 0, finalized = 0;
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          try {
            steps[call].done();
            await assertions[call++];
            yield 'Monkey';
            steps[2].done();
            await assertions[2];
            yield 'Pig';
            steps[3].done();
            await assertions[3];
            yield 'Chicken';
            steps[4].done();
          } finally {
            finalized++;
          }
        }, []);
      }
      const el = createElement(Test);
      const strict = createElement(StrictMode, {}, el);
      await render(strict);
      // in strict mode a function passed to useMemo (used by useSequential) is run twice
      await steps[0];
      await steps[1];
      expect(node.textContent).to.equal('Cow');
      await assertions[0].done();
      await assertions[1].done();
      await steps[2];
      expect(node.textContent).to.equal('Monkey');
      await assertions[2].done();
      await steps[3];
      expect(node.textContent).to.equal('Pig');
      await assertions[3].done();
      await steps[4];
      expect(node.textContent).to.equal('Chicken');
      // wait for timeout to occur
      await delay(75);
      expect(call).to.equal(2);
      expect(finalized).to.equal(call);
    })
  })
  skip.if.dom.is.absent.or.not.in.development.mode.
  it('should allow a container component to return a suspending component when a real DOM is involved', async function() {
    await withReactDOM(async ({ render, act, node }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let call = 0;
      function Test() {
        return useSequential(async function*({ suspend }) {
          suspend('#112');
          steps[call].done();
          await assertions[call++];
          yield 'Pig';
          steps[4].done();
          await assertions[4];
          yield 'Chicken';
          steps[5].done();
        }, []);
      }
      const el = createElement(Test);
      const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
      const strict = createElement(StrictMode, {}, suspense);
      // the callback will get invoked 2 x 2 = 4 times; twice due to StrictMode
      // and twice due to suspension/unsuspension
      await render(strict);
      await steps[0];
      await steps[1];
      expect(node.textContent).to.equal('Cow');
      await assertions[0].done();
      await assertions[1].done();
      // at this point the component is suspended; wait for it to get mounted twice again
      await steps[2];
      await steps[3];
      await assertions[2].done();
      await assertions[3].done();
      await steps[4];
      expect(node.textContent).to.equal('Pig');
      await assertions[4].done();
      await steps[5];
      expect(node.textContent).to.equal('Chicken');
      expect(call).to.equal(4);
    });
  })
  skip.if.dom.is.absent.
  it('should allow a container component to return a suspending component when strict mode is not used', async function() {
    await withReactDOM(async ({ render, act, node }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let call = 0;
      function Test() {
        return useSequential(async function*({ suspend }) {
          suspend('#112');
          steps[call].done();
          await assertions[call++];
          yield 'Pig';
          steps[4].done();
          await assertions[4];
          yield 'Chicken';
          steps[5].done();
        }, []);
      }
      const el = createElement(Test);
      const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
      await render(suspense);
      await steps[0];
      expect(node.textContent).to.equal('Cow');
      await assertions[0].done();
      await assertions[1].done();
      await steps[4];
      expect(node.textContent).to.equal('Pig');
      await assertions[4].done();
      await steps[5];
      expect(node.textContent).to.equal('Chicken');
      expect(call).to.equal(2);
    });
  })
  it('should run callback provided through mount', async function() {
    let mounted = false, unmounted = false;
    await withTestRenderer(async ({ create, unmount }) => {
      function Test() {
        return useSequential(async function*({ mount }) {
          mount(() => {
            mounted = true;
            return () => {
              unmounted = true;
            };
          });
          yield 'Chicken';
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(mounted).to.be.true;
      expect(unmounted).to.be.false;
      unmount();
      expect(unmounted).to.be.true;
    });
  })
  it('should allow generator to keep running when preventDefault is used', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON }) => {
      const steps = createSteps(), assertions = createSteps();
      function Test() {
        return useSequential(async function*({ fallback, mount }) {
          fallback('Cow');
          mount(() => {
            return (evt) => evt.preventDefault();
          });
          try {
            await assertions[0];
            yield 'Monkey';
            steps[1].done();
            await assertions[1];
            yield 'Pig';
            steps[2].done();
            await assertions[2];
            yield 'Chicken';
            steps[3].done('end');
          } finally {
            steps[4].done('finally')
          }
        }, []);
      }
      const el = createElement(Test);
      create(el);
      expect(toJSON()).to.equal('Cow');
      assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Monkey');
      unmount();
      expect(toJSON()).to.equal(null);
      assertions[1].done();
      assertions[2].done();
      const results = await Promise.race([ Promise.all([ steps[3], steps[4] ]), delay(20) ]);
      expect(results).to.eql([ 'end', 'finally' ]);
    });
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
