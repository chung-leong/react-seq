import { expect } from 'chai';
import { createElement, Suspense, lazy } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { withServerSideRendering, withReactHydration } from './dom-renderer.js';
import { createSteps } from './step.js';
import { createErrorBoundary, caughtAt } from './error-handling.js';
import { createWriteStream } from 'fs';
import { delay, Abort } from '../index.js';
import { isAbortError, createTrigger } from '../src/utils.js';

import {
  useSequential,
  useSequentialState,
} from '../index.js';
import {
  renderInChildProc,
} from '../server.js';

describe('Server-side rendering', function() {
  it('should render correctly to a stream', async function() {
    await withServerSideRendering(async () => {
      function TestComponent() {
        return useSequential(async function*({ fallback, defer }) {
          fallback(createElement('div', {}, 'Cow'));
          defer(100);
          await delay(5);
          yield createElement('div', {}, 'Pig');
          await delay(5);
          yield createElement('div', {}, 'Chicken');
          await delay(5);
          yield createElement('div', {}, 'Rocky');
        }, []);
      }
      const el = createElement(TestComponent);
      const html = await renderToString(el);
      expect(html).to.contain('<div>Rocky</div>');
    });
  })
  it('should extend update delay when SSR is in effect', async function() {
    await withServerSideRendering(async () => {
      function TestComponent() {
        return useSequential(async function*({ fallback, defer }) {
          fallback(createElement('div', {}, 'Cow'));
          defer(30);
          await delay(25);
          yield createElement('div', {}, 'Pig');
          await delay(25);
          yield createElement('div', {}, 'Chicken');
          await delay(25);
          yield createElement('div', {}, 'Rocky');
        }, []);
      }
      const el = createElement(TestComponent);
      const html = await renderToString(el);
      expect(html).to.contain('<div>Rocky</div>');
    });
  })
  it('should not extend delay when deferment is not used', async function() {
    await withServerSideRendering(async () => {
      function TestComponent() {
        return useSequential(async function*({ fallback }) {
          fallback(createElement('div', {}, 'Cow'));
          await delay(5);
          yield createElement('div', {}, 'Pig');
          await delay(5);
          yield createElement('div', {}, 'Chicken');
          await delay(5);
          yield createElement('div', {}, 'Rocky');
        }, []);
      }
      const el = createElement(TestComponent);
      const html = await renderToString(el);
      expect(html).to.contain('<div>Pig</div>');
    });
  })
  it('should yield timeout content when first item takes too long', async function() {
    await withServerSideRendering(async () => {
      function TestComponent() {
        return useSequential(async function*({ fallback, timeout }) {
          fallback(createElement('div', {}, 'Cow'));
          timeout(1000, async () => createElement('div', {}, 'Tortoise'));
          await delay(60);
          yield createElement('div', {}, 'Pig');
          await delay(50);
          yield createElement('div', {}, 'Chicken');
          await delay(50);
          yield createElement('div', {}, 'Rocky');
        }, []);
      }
      const el = createElement(TestComponent);
      const html = await renderToString(el);
      expect(html).to.contain('<div>Tortoise</div>');
    }, 30);
  })
  it('should use pending content instead of timeout content when available', async function() {
    await withServerSideRendering(async () => {
      function TestComponent() {
        return useSequential(async function*({ fallback, defer, timeout }) {
          fallback(createElement('div', {}, 'Cow'));
          defer(30)
          timeout(1000, async () => createElement('div', {}, 'Tortoise'));
          await delay(20);
          yield createElement('div', {}, 'Pig');
          await delay(100);
          yield createElement('div', {}, 'Chicken');
          await delay(50);
          yield createElement('div', {}, 'Rocky');
        }, []);
      }
      const el = createElement(TestComponent);
      const html = await renderToString(el);
      expect(html).to.contain('<div>Pig</div>');
    }, 35);
  })
  it('should terminate generator after the first item when SSR is in effect on server', async function() {
    await withServerSideRendering(async () => {
      const steps = createSteps(), assertions = createSteps(act);
      function TestComponent() {
        return useSequential(async function*({ fallback }) {
          fallback(createElement('div', {}, 'Cow'));
          try {
            await assertions[0];
            yield createElement('div', {}, 'Pig');
            steps[1].done();
            await assertions[1];
            yield createElement('div', {}, 'Chicken');
            steps[2].done();
            await assertions[2];
            yield createElement('div', {}, 'Rocky');
            steps[3].done();
          } finally {
            steps[4].done('finally');
          }
        }, []);
      }
      const el = createElement(TestComponent);
      await assertions[0].done();
      await assertions[1].done();
      await assertions[2].done();
      const html = await renderToString(el);
      expect(html).to.contain('<div>Pig</div>');
      const result = await Promise.race([ steps[1], steps[2], steps[3], steps[4] ]);
      expect(result).to.equal('finally');
    });
  })
  it('should terminate generator of state hook immediately on server', async function() {
    await withServerSideRendering(async () => {
      const steps = createSteps(), assertions = createSteps(act);
      function TestComponent() {
        const state = useSequentialState(async function*({ initial }) {
          initial('Cow');
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
          } finally {
            steps[4].done('finally');
          }
        }, []);
        return createElement('div', {}, state);
      }
      const el = createElement(TestComponent);
      await assertions[0].done();
      await assertions[1].done();
      await assertions[2].done();
      const html = await renderToString(el);
      expect(html).to.contain('<div>Cow</div>');
      const result = await Promise.race([ steps[1], steps[2], steps[3], steps[4] ]);
      expect(result).to.equal('finally');
    });
  })
  skip.entirely.if(!global.gc).
  it('should not leak memory', async function() {
    this.timeout(60000);
    await withServerSideRendering(async () => {
      async function step() {
        function TestComponent() {
          return useSequential(async function*({ fallback, defer }) {
            fallback(createElement('div', {}, 'Cow'));
            defer(100);
            await delay(0);
            yield createElement('div', {}, 'Pig');
            await delay(0);
            yield createElement('div', {}, 'Chicken');
            await delay(0);
            yield createElement('div', {}, 'Rocky');
          }, []);
        }
        const el = createElement(TestComponent);
        await renderToString(el);
      }
      async function test() {
        for (let i = 0; i < 5000; i++) {
          await step();
        }
        // a bit of time for timers to finish
        await delay(500);
      }

      // establish base-line memory usage first
      await test();
      // perform garbage collection
      gc();
      const before = process.memoryUsage().heapUsed;
      // run the test multiple times
      for (let i = 0; i < 40; i++) {
        await test();
      }
      // perform garbage collection again
      gc();
      const after = process.memoryUsage().heapUsed;
      const diff = Math.round(after - before);
      expect(diff).to.not.be.above(0);
    });
  })
})

describe('Hydration', function() {
  it('should allow correct hydration of a component', async function() {
    const steps = createSteps(), assertions = createSteps(act);
    function TestComponent() {
      return useSequential(async function*({ fallback, defer }) {
        fallback(createElement('div', {}, 'Cow'));
        defer(25);
        await assertions[0];
        yield createElement('div', {}, 'Pig');
        await assertions[1];
        yield createElement('div', {}, 'Chicken');
        await assertions[2];
        yield createElement('div', {}, 'Rocky');
      }, []);
    }
    const el = createElement(TestComponent);
    const html = '<!--$--><div>Rocky</div><!--/$-->';
    await withReactHydration(html, el, async ({ node, root }) => {
      await assertions[0].done();
      expect(hasSuspended(root)).to.be.true;
      expect(node.innerHTML).to.contain('<div>Rocky</div>');
      await assertions[1].done();
      expect(hasSuspended(root)).to.be.true;
      expect(node.innerHTML).to.contain('<div>Rocky</div>');
      await assertions[2].done();
      expect(hasSuspended(root)).to.be.false;
      expect(node.innerHTML).to.contain('<div>Rocky</div>');
    });
  })
  it('should correctly hydrate a component using a state hook', async function() {
    const steps = createSteps(), assertions = createSteps(act);
    function TestComponent() {
      const state = useSequentialState(async function*({ initial }) {
        initial('Cow');
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
        } finally {
          steps[4].done('finally');
        }
      }, []);
      return createElement('div', {}, state);
    }
    const html = '<div>Cow</div>';
    const el = createElement(TestComponent);
    await withReactHydration(html, el, async ({ node }) => {
      expect(node.innerHTML).to.contain('<div>Cow</div>');
      await assertions[0].done();
      await steps[1];
      return;
      expect(node.innerHTML).to.contain('<div>Pig</div>');
      await assertions[1].done();
      await steps[2];
      expect(node.innerHTML).to.contain('<div>Chicken</div>');
      await assertions[2].done();
      await steps[3];
      expect(node.innerHTML).to.contain('<div>Rocky</div>');
      const result = await steps[4];
      expect(result).to.equal('finally');
    });
  })
  it('should let generator run to the end when hydrating a component', async function() {
    const steps = createSteps(), assertions = createSteps(act);
    function TestComponent() {
      return useSequential(async function*({ fallback }) {
        fallback(createElement('div', {}, 'Cow'));
        try {
          await assertions[0];
          yield createElement('div', {}, 'Pig');
          steps[1].done();
          await assertions[1];
          yield createElement('div', {}, 'Chicken');
          steps[2].done();
          await assertions[2];
          yield createElement('div', {}, 'Rocky');
          steps[3].done();
        } finally {
          steps[4].done('finally');
        }
      }, []);
    }
    const html = '<!--$--><div>Pig</div><!--/$-->';
    const el = createElement(TestComponent);
    await withReactHydration(html, el, async ({ node }) => {
      await assertions[0].done();
      await steps[1];
      expect(node.innerHTML).to.contain('<div>Pig</div>');
      await delay(100);
      await assertions[1].done();
      await steps[2];
      expect(node.innerHTML).to.contain('<div>Chicken</div>');
      await assertions[2].done();
      await steps[3];
      expect(node.innerHTML).to.contain('<div>Rocky</div>');
      const result = await steps[4];
      expect(result).to.equal('finally');
    });
  })
})

describe('#renderInChildProc()', function() {
  skip.it('should find the JS path from the HTML and load it', async function() {
    const buildPath = resolve('./cra/build');
  })
  skip.it('should fail when it cannot find the path to the JS script', async function() {
    const buildPath = resolve('./cra/bad-build-1');
  })
  skip.it('should fail when it cannot find the root node', async function() {
    const buildPath = resolve('./cra/bad-build-2');
  })
})

async function renderToString(element) {
  let pipeable;
  await new Promise((resolve, reject) => {
    pipeable = renderToPipeableStream(element, {
      onShellError: reject,
      onError: reject,
      onAllReady: () => resolve(),
    });
  });
  const finish = createTrigger();
  const chunks = [];
  const writable = {
    write(data) {
      chunks.push(Buffer.from(data));
      return true;
    },
    end(data) {
      if (data) {
        chunks.push(Buffer.from(data));
      }
      ended = true;
      finish.resolve(true);
      return this;
    },
    on(name, cb) {
      if (name === 'drain' || name === 'close') {
        cb();
      }
      return this;
    },
    destroy() {
    },
  };
  pipeable.pipe(writable);
  return Buffer.concat(chunks).toString();
}

function hasSuspended(root) {
  function check(node) {
    if (node.memoizedState && 'dehydrated' in node.memoizedState) {
      return true;
    }
    for (let c = node.child; c; c = c.sibling) {
      if (check(c)) {
        return true;
      }
    }
    return false;
  }
  return check(root._internalRoot.current);
}

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}
