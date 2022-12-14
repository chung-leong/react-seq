import { expect } from 'chai';
import { createElement } from 'react';
import { withTestRenderer } from './test-renderer.js';
import { createSteps } from './step.js';
import { createErrorBoundary, withSilentConsole, caughtAt } from './error-handling.js';
import { delay } from '../index.js';

import {
  progressive,
  useProgressive,
} from '../index.js';

describe('#progressive', function() {
  it('should return a component that renders progressively', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { element: el, abortManager: am } = progressive(async ({ fallback, type, usable }) => {
        fallback('None');
        type(TestComponent);
        usable({
          animals: 1
        });
        return { animals: generate() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig, Donkey');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should defer rendering until all items is fetched from generator', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { element: el, abortManager: am } = progressive(async ({ fallback, type, usable }) => {
        fallback('None');
        type(TestComponent);
        usable(NaN);
        return { animals: generate() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('None');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should rendering with available data when deferrment delay is reached', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { element: el, abortManager: am } = progressive(async ({ fallback, type, defer, usable }) => {
        type(TestComponent);
        fallback('None');
        defer(15);
        usable({ animals: 1 })
        return { animals: generate() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      await assertions[1].done();
      await steps[2];
      await delay(25);
      expect(toJSON()).to.equal('Pig, Donkey');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should trigger error boundary when a generator throws', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = progressive(async ({ fallback, usable, type }) => {
          fallback('None');
          type(TestComponent);
          usable({ animals: 1 });
          return { animals: generate() };
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(toJSON()).to.equal('None');
        await assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('Pig');
        await assertions[1].done();
        await steps[2];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should accept a module with default as type', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { element: el, abortManager: am } = progressive(async ({ fallback, usable, type }) => {
        fallback('None');
        type({ default: Title });
        usable({ animals: 1 });
        return { animals: generate() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig' ] });
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig, Donkey' ] });
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql({ type: 'h1', props: {}, children: [ 'Pig, Donkey, Chicken' ] });
    });
  })
  it('should accept an element-creating function in lieu of a type', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { element: el, abortManager: am } = progressive(async ({ fallback, usable, element }) => {
        fallback('None');
        usable({ animals: 1 });
        element(({ animals = [] }) => createElement('span', {}, animals.join(', ')));
        return { animals: generate() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig' ] });
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig, Donkey' ] });
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql({ type: 'span', props: {}, children: [ 'Pig, Donkey, Chicken' ] });
    });
  })
  it('should progressively render values from sync generator', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(0), assertions = createSteps(act);
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
      const { element: el, abortManager: am } = progressive(async ({ fallback, usable, type }) => {
        fallback('None');
        type(TestComponent);
        usable({ animals: 1 });
        return { animals: generate() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig, Donkey');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should throw if an element type is not given', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = progressive(async () => {
          return {};
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should throw if both type and element are used', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON }) => {
      await withSilentConsole(async () => {
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
  it('should throw if usable is given incorrect parameter', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = progressive(async ({ usable }) => {
          usable('cow', 1);
          return {};
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(caughtAt(boundary)).to.be.an('error');
      })
    });
  })
  it('should throw if usable is given an object with incorrect properties', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = progressive(async ({ usable }) => {
          usable({ cow: false });
          return {};
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(caughtAt(boundary)).to.be.an('error');
      })
    });
  })
  it('should throw if function returns a non-object', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      await withSilentConsole(async () => {
        const { element: el, abortManager: am } = progressive(async ({ element }) => {
          element((props) => 'Hello');
          return 123;
        });
        const boundary = createErrorBoundary(el);
        await create(boundary);
        am.onMount();
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should accept number as usablility default', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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

      const { element: el, abortManager: am } = progressive(async ({ element, usable, fallback }) => {
        fallback('None');
        usable(2);
        element(({ animals, sandwiches }) => `${animals.join(', ')} (${sandwiches.join(', ')})`);
        return { animals: create1(), sandwiches: create2() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('None');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('None');
      await assertions[3].done()
      await steps[4];
      expect(toJSON()).to.equal('Pig, Cow (Cuban, Hamburger)');
      await assertions[4].done()
    });
  })
  it('should let usable override the default for one prop', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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

      const { element: el, abortManager: am } = progressive(async ({ element, usable, fallback }) => {
        fallback('None');
        usable(0);
        usable({ sandwiches: 1 })
        element(({ animals, sandwiches }) => `${animals.join(', ')} (${sandwiches.join(', ')})`);
        return { animals: create1(), sandwiches: create2() };
      });
      await create(el);
      am.onMount();
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('None');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig (Cuban)');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Cow (Cuban)');
      await assertions[3].done()
      await steps[4];
      expect(toJSON()).to.equal('Pig, Cow (Cuban, Hamburger)');
      await assertions[4].done()
    });
  });
})

describe('#useProgressive()', function() {
  it('should return a component that renders progressively', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Pig, Donkey');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Pig, Donkey, Chicken');
    });
  })
  it('should use a dynamically loaded module', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      await create(el);
      expect(toJSON()).to.equal('None');
      await assertions[0].done();
      await steps[1];
      expect(JSON.parse(toJSON())).to.eql({ animals: [ 'Pig' ] });
      await assertions[1].done();
      await steps[2];
      expect(JSON.parse(toJSON())).to.eql({ animals: [ 'Pig', 'Donkey' ] });
      await assertions[2].done();
      await steps[3];
      expect(JSON.parse(toJSON())).to.eql({ animals: [ 'Pig', 'Donkey', 'Chicken' ] });
    });
  })
  it('should warn when loaded module does not have a default export', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function ContainerComponent() {
        return useProgressive(async ({ type }) => {
          await assertions[0];
          type(await import('./components/Empty.js'));
          steps[1].done();
          return {};
        }, []);
      }
      const el = createElement(ContainerComponent);
      const output = {};
      await withSilentConsole(async () => {
        await create(el);
        expect(JSON.parse(toJSON())).to.eql(null);
        await assertions[0].done();
        await steps[1];
      }, output);
      expect(output.warn).to.contain('default');
    });
  })
  it('should warn when type is given a promise', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function ContainerComponent() {
        return useProgressive(async ({ type }) => {
          await assertions[0];
          type(import('./components/Empty.js'));
          steps[1].done();
          return {};
        }, []);
      }
      const el = createElement(ContainerComponent);
      const output = {};
      await withSilentConsole(async () => {
        await create(el);
        expect(JSON.parse(toJSON())).to.eql(null);
        await assertions[0].done();
        await steps[1];
      }, output);
      expect(output.warn).to.contain('await');
    });
  })
  it('should warn when usability is specified for a prop that does not appear in the return object', async function () {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const output = {};
      await withSilentConsole(async () => {
        await create(el);
        expect(JSON.parse(toJSON())).to.eql(null);
        await assertions[0].done();
        await steps[1];
      }, output);
      expect(output.warn).to.contain('prop');
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
