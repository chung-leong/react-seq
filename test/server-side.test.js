import { expect } from 'chai';
import { createElement, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { createSteps } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { createWriteStream } from 'fs';
import { delay, Abort } from '../index.js';
import { isAbortError, createTrigger } from '../src/utils.js';

import {
  useSequential,
  extendDelay,
} from '../index.js';
import {
  renderToReadableStream,
} from '../server/index.js';
import {
  hydrateRoot,
  unsuspendRoot,
  hasSuspended,
} from '../client/index.js';

describe('Server-side rendering', function() {
  it('should render correctly to a stream', async function() {
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
    const stream = renderToReadableStream(el);
    const html = await readStream(stream);
    expect(html).to.contain('<div>Rocky</div>');
  })
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
    const stream = renderToReadableStream(el);
    await assertions[0].done();
    await assertions[1].done();
    await assertions[2].done();
    const html = await readStream(stream);
    expect(html).to.contain('<div>Rocky</div>');
    assertions.splice(0);
    const container = document.getElementById('root');
    container.innerHTML = html;
    let root;
    root = hydrateRoot(container, el);
    await assertions[0].done();
    expect(hasSuspended(root)).to.be.true;
    expect(container.innerHTML).to.contain('<div>Rocky</div>');
    await assertions[1].done();
    expect(hasSuspended(root)).to.be.true;
    expect(container.innerHTML).to.contain('<div>Rocky</div>');
    await assertions[2].done();
    expect(hasSuspended(root)).to.be.false;
    expect(container.innerHTML).to.contain('<div>Rocky</div>');
  })
  skip.entirely.if(!global.gc).
  it('should not leak memory', async function() {
    this.timeout(60000);
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
      const stream = renderToReadableStream();
      await readStream(stream);
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
  })
})

async function readStream(stream) {
  const buffers = [];
  for await (const chunk of stream) {
    buffers.push(chunk);
  }
  return Buffer.concat(buffers).toString();
}
