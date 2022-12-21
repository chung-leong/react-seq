import { expect } from 'chai';
import { withTestRenderer } from './test-renderer.js';
import { withReactDOM } from './dom-renderer.js';
import { createElement, Suspense, StrictMode } from 'react';
import { createSteps } from './step.js';
import { createErrorBoundary, withSilentConsole, caughtAt } from './error-handling.js';
import { delay, settings, Abort } from '../index.js';
import { isAbortError } from '../src/utils.js';

import {
  sequential,
  useSequential,
} from '../index.js';

describe('#sequential()', function() {
  it('should return a Suspense element', function() {
    const { element: el, abortManager: am } = sequential(async function*({ fallback }) {
      fallback('Cow');
      yield 'Pig';
    });
    expect(el).to.have.property('type', Suspense);
  })
  it('should return a component that uses the first item from the generator as its content', async function() {
    await withTestRenderer(async ({ create, toJSON, act, root }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const seq = useSequential();
        return seq();
      }
      const { element: el, abortManager: am } = sequential(async function*({ fallback }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
    });
  })
  it('should return a component that defers rendering', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ fallback, defer }) {
        fallback('Cow');
        defer(20);
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Cow');
      await delay(25);
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return a component that displays new contents intermittently', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ defer }) {
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
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal(null);
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      await delay(25);
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig');
      await delay(25);
      expect(toJSON()).to.equal('Duck');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should handle generators from sub-functions', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*() {
        async function* generate1() {
          await assertions[0];
          yield 'Pig';
          steps[1].done();
        }
        async function* generate2() {
          await assertions[1];
          yield 'Duck';
          steps[2].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
        }
        yield generate1();
        yield generate2();
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal(null);
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Duck');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should allow deferrment to be turned off midway', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ defer }) {
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
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal(null);
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      await delay(15);
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Duck');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return a component that eventually shows the final item from the generator', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*() {
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal(null);
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should return a component that uses fallback', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ fallback, defer }) {
        fallback('Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should allow fallback to be created by a callback function', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ fallback, defer }) {
        fallback(() => 'Cow');
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should throw when fallback is called after an await statement', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ fallback, defer }) {
        await assertions[0];
        setTimeout(() => steps[1].done(), 0);
        fallback('Cow');
        yield 'Pig';
        steps[2].done();
      });
      await withSilentConsole(async () => {
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(toJSON()).to.equal(null);
        await assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should not throw when fallback is called after an await statement when there is a fallback', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ fallback, defer }) {
        fallback('Cow');
        await assertions[0];
        fallback('Cow');
        yield 'Pig';
        steps[1].done();
      });
      await withSilentConsole(async () => {
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(toJSON()).to.equal('Cow');
        await assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('Pig');
      });
    });
  })
  it('should allow management of events using promises', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let triggerClick;
      const { element: el, abortManager: am } = sequential(async function*({ fallback, manageEvents }) {
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
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await delay(10);
      // should be the same still as it's still waiting for the click
      expect(toJSON()).to.equal('Pig');
      triggerClick();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      await assertions[2].done();
      await delay(10);
      // ditto
      expect(toJSON()).to.equal('Chicken');
      triggerClick();
      await steps[3];
      expect(toJSON()).to.equal('Rocky');
    });
  })
  it('should create only a single instance of event manager', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let triggerClick;
      let on1, on2, eventual1, eventual2;
      const { element: el } = sequential(async function*({ manageEvents }) {
        await assertions[0];
        [ on1, eventual1 ] = manageEvents();
        [ on2, eventual2 ] = manageEvents();
        steps[1].done();
        yield 'Hello';
      });
      await create(el);
      await assertions[0].done();
      await steps[1];
      expect(on1).to.not.be.undefined;
      expect(on1).to.equal(on2);
      expect(eventual1).to.not.be.undefined;
      expect(eventual1).to.equal(eventual2);
    });
  })
  it('should terminate iteration when component is unmounted mid-cycle', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ fallback }) {
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
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      await unmount();
      await assertions[2].done();
      expect(toJSON()).to.equal(null);
      await assertions[3].done();
      await assertions[4].done();
      const result = await Promise.race([ steps[4], steps[5] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should render timeout content when time limit is breached', async function() {
    try {
      settings({
        ssr: 'server',
        ssr_timeout: 10,
        ssr_timeout_handler: async () => 'Tortoise',
      });
      await withTestRenderer(async ({ create, toJSON, act }) => {
        const steps = createSteps(), assertions = createSteps(act);
        const { element: el, abortManager: am } = sequential(async function*({ defer, fallback, timeout }) {
          defer(10);
          fallback('Cow');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
        });
        await create(el);
        am.onMount();
        await delay(25);
        expect(toJSON()).to.equal('Tortoise');
        await assertions[0].done();
      });
    } finally {
      settings({ ssr: false });
    }
  })
  it('should correctly deal with undefined as the timeout content', async function() {
    try {
      settings({
        ssr: 'server',
        ssr_timeout: 10,
        ssr_timeout_handler: null,
      });
      await withTestRenderer(async ({ create, toJSON, act }) => {
        const steps = createSteps(), assertions = createSteps(act);
        const { element: el, abortManager: am } = sequential(async function*({ defer, fallback, timeout }) {
          defer(10);
          fallback('Cow');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
        });
        await create(el);
        am.onMount();
        await delay(25);
        expect(toJSON()).to.be.null;
        await assertions[0].done();
      });
    } finally {
      settings({ ssr: false });
    }
  })
  it('should allow creation of a suspending component', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const { element: el, abortManager: am } = sequential(async function*({ suspend }) {
        suspend();
        await assertions[0];
        yield 'Pig';
        steps[1].done();
        await assertions[1];
        yield 'Chicken';
        steps[2].done();
      });
      const suspense = createElement(Suspense, { fallback: 'Cow' }, el);
      await create(suspense);
      am.onMount();
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      await delay(100);
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should throw when suspend and fallback are used at the same time', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON, act }) => {
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
      await withSilentConsole(async () => {
        const boundary1 = createErrorBoundary(el1);
        await create(boundary1);
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary1)).to.be.an('error');
        await unmount();

        const boundary2 = createErrorBoundary(el2);
        await create(boundary2);
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary2)).to.be.an('error');
      });
    });
  })
  it('should trigger error boundary', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = sequential(async function*({ fallback }) {
          fallbak('Cow'); // typo causing the function to throw
          yield createElement('div', {}, cat); // also an undeclared variable here
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should trigger error boundary after a yield', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = sequential(async function*({ fallback }) {
          fallback('Cow');
          await assertions[0];
          yield createElement('div', {}, 'Pig');
          await steps[1].done();
          await dely(10); // <-- typo
          yield createElement('div', {}, cat);
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(toJSON()).to.equal('Cow');
        await assertions[0].done();
        await steps[1];
        await delay(0);
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
})

describe('#useSequential()', function() {
  it('should recreate element when dependencies change', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el1);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Barbie');
      await assertions[2].done();
      await steps[3];
      expect(cats).to.eql([ 'Barbie' ]); // first generator was terminated before reaching end
    });
  })
  it('should recreate generator when dependencies are not specified', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el1);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Barbie');
      await assertions[2].done();
      await steps[3];
      expect(cats).to.eql([ 'Barbie' ]); // first generator was terminated before reaching end
    });
  })
  it('should not recreate generator when dependencies has not changed', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el1);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Rocky');
      const el2 = createElement(Test, { cat: 'Rocky', dog: 'Pi' });
      await update(el2);
      await assertions[2].done();
      await steps[3];
      expect(cats).to.eql([ 'Rocky' ]);
    });
  })
  it('should terminate generator correctly if unmount occurs while fallback is being display', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await unmount();
      expect(toJSON()).to.equal(null);
      await assertions[0].done();
      const result = await Promise.race([ steps[1], steps[2] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should terminate iteration when dependencies change mid-cycle', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { cat: 'Barbie' });
      const promise = update(el2);
      expect(toJSON()).to.equal('Cow');
      await promise;
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Barbie');
      expect(cats).to.eql([]);
      await assertions[3].done();
      await steps[4];
      expect(cats).to.eql([ 'Barbie' ]);
      expect(finalized).to.eql([ 'Rocky', 'Barbie' ]);
    });
  })
  it('should cause all event promises to reject on unmount', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ fallback, manageEvents }) {
          fallback('Cow');
          const [ on, eventual ] = manageEvents();
          try {
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await eventual.click.or.keypress.and('assertion', assertions[1]);
            yield 'Chicken';
            steps[2].done();
            await eventual.click.and('assertion', assertions[2]);
            yield 'Rocky';
            steps[3].done('end');
          } finally {
            steps[4].done('finally');
          }
        });
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await update(null);
      expect(toJSON()).to.equal(null);
      const result = await Promise.race([ steps[3], steps[4] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should cause all event promises to reject on prop change', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
            await eventual.click.and.keypress.and('assertion', assertions[1]);
            yield 'Chicken';
            steps[2].done();
            await eventual.click.and('assertion', assertions[2]);
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
      await create(el1);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
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
      await assertions[2].done();
      await delay(10);
      expect(toJSON()).to.equal('Chicken');  // no change--still waiting for click
      triggerClick();
      await steps[3];
      expect(toJSON()).to.equal('Barbie');
      await assertions[3].done();
      await steps[4];
      expect(cats).to.eql([ 'Barbie' ]);
      expect(errors[0]).to.be.an.instanceOf(Abort);
      expect(finalized).to.eql([ 'Rocky', 'Barbie' ]);
    });
  })
  it('should quietly shut down generator when an AbortError is encountered', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(boundary);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
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
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(boundary);
      expect(toJSON()).to.equal('Cow');
      abortController.abort();
      await assertions[0].done();
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
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(suspense);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
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
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal(null);
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal(null);
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should correctly deal with undefined as the initial non-fallback content', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal(null);
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig');
      await assertions[2].done();
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
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await delay(45);
      expect(toJSON()).to.equal('Pig');
    });
  })
  it('should show previously pending content after flush is called', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Cow');
      f();
      await delay(5);
      expect(toJSON()).to.equal('Monkey');
      await assertions[1].done();
      await steps[2];
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  it('should show previously pending content after initial item has been retrieved and flush is called', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Monkey');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Monkey');
      f();
      await delay(5);
      expect(toJSON()).to.equal('Pig');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Chicken');
    });
  })
  skip.if.not.in.development.mode.
  it('should work under strict mode', async function() {
    await withReactDOM(async ({ render, act, node }) => {
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
    }, 10);
  })
  skip.entirely.if(!global.gc).or.if(!global.WeakRef).or.not.in.development.mode.
  it('should allow spurious generator created by strict mode to be garbage-collected', async function() {
    await withReactDOM(async ({ render, act, node, unmount }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let call = 0, finalized = 0;
      const refs = [];
      function Test() {
        return useSequential(function({ fallback }) {
          async function* generate() {
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
          }
          const generator = generate();
          refs.push(new WeakRef(generator));
          return generator;
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
      // the spurious generator should be garbage-collectable at this point, since it was assertions[0] holding a
      // ref to a function that kept it in play
      gc();
      expect(refs[0].deref()).to.be.undefined;
      expect(refs[1].deref()).to.not.be.undefined;
      await steps[2];
      expect(node.textContent).to.equal('Monkey');
      await assertions[2].done();
      await steps[3];
      expect(node.textContent).to.equal('Pig');
      await assertions[3].done();
      await steps[4];
      expect(node.textContent).to.equal('Chicken');
      expect(call).to.equal(2);
      // the finally section ran only once, since the spurious generator never got this far
      expect(finalized).to.equal(1);
      expect(refs).to.have.lengthOf(2);
      // unmount and perform garbage collection again
      await unmount();
      gc();
      expect(refs[0].deref()).to.be.undefined;
      expect(refs[1].deref()).to.be.undefined;
    });
  })
  skip.if.not.in.development.mode.
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
  it('should fulfill promise returned by mount', async function() {
    let promise;
    await withTestRenderer(async ({ create }) => {
      function Test() {
        return useSequential(async function*({ mount }) {
          promise = mount();
          yield 'Chicken';
        }, []);
      }
      const el = createElement(Test);
      await create(el);
      expect(promise).to.be.a('promise');
      await expect(promise).to.eventually.be.fulfilled;
    });
  })
  it('should not trigger flush when delay is set to 0', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ fallback, defer }) {
          fallback('Cow');
          defer(100);
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          defer(0);
          steps[3].done();
          await assertions[3];
          yield 'Bear';
          steps[4].done();
        }, []);
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.eql('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql('Cow');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql('Cow');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql('Cow');
      await assertions[3].done();
      await steps[4];
      expect(toJSON()).to.eql('Bear');
    });
  })
  it('should survive parent component going into suspension', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Root({ showB = false }) {
        const children = [ createElement(CompA) ];
        if (showB) {
          children.push(' ');
          children.push(createElement(CompB));
        }
        return createElement(Suspense, { fallback: 'Monkey' }, ...children);
      }
      let compACount = 0;
      function CompA() {
        return useSequential(async function*({ suspend }) {
          const id = compACount++;
          suspend('comp-A');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[2];
          yield 'Chicken';
          steps[3].done();
          await assertions[3];
          yield 'Bear';
          steps[4].done();
        }, []);
      }
      function CompB() {
        return useSequential(async function*({ suspend }) {
          suspend('comp-B');
          await assertions[1];
          yield 'Dingo';
          steps[2].done();
        });
      }
      const el1 = createElement(Root, { showB: false });
      await create(el1);
      expect(toJSON()).to.eql('Monkey');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      const el2 = createElement(Root, { showB: true });
      await update(el2);
      await delay(20);
      expect(toJSON()).to.eql([ 'Monkey' ]);
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql([ 'Pig', ' ', 'Dingo' ]);
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql([ 'Chicken', ' ', 'Dingo' ]);
      await assertions[3].done();
      await steps[4];
      expect(toJSON()).to.eql([ 'Bear', ' ', 'Dingo' ]);
    });
  })
  it('should flush content when awaiting on a promise', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ defer, fallback, manageEvents }) {
          fallback('Cow');
          const [ on, eventual ] = manageEvents();
          for (;;) {
            defer(100);
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await assertions[1];
            yield 'Chicken';
            steps[2].done();
            await assertions[2];
            yield 'Bear';
            steps[3].done();
            await eventual.click.or.keyPress.or.peaceInPalestine;
          }
        }, []);
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.eql('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql('Cow');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql('Cow');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql('Bear');
    });
  })
  it('should disable deferrment after event manager reports an await', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ defer, fallback, manageEvents }) {
          fallback('Cow');
          const [ on, eventual ] = manageEvents();
          defer(Infinity);
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          yield 'Bear';
          steps[3].done();
          eventual.click.or.keyPress.or.peaceInPalestine.then(() => {});
          await assertions[3];
          yield 'Dingo';
          // resolving the promise means deferrment is turned back on
          on.peaceInPalestine('snow in hell');
          steps[4].done();
          await assertions[4];
          yield 'Rabbit';
          steps[5].done();
          await assertions[5];
          yield 'Donkey';
          steps[6].done();
        }, []);
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.eql('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql('Cow');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql('Cow');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql('Bear');
      await assertions[3].done();
      await steps[4];
      expect(toJSON()).to.eql('Dingo');
      await assertions[4].done();
      await steps[5];
      expect(toJSON()).to.eql('Dingo');
      await assertions[5].done();
      await steps[6];
      expect(toJSON()).to.eql('Donkey');
    });
  })
})
