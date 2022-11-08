import { expect } from 'chai';
import { createElement, Suspense, lazy } from 'react';
import { createSteps } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { renderToPipeableStream } from 'react-dom/server';
import { delay, Abort } from '../index.js';
import { isAbortError, createTrigger } from '../src/utils.js';

import {
  useSequential,
  extendDelay,
} from '../index.js';

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
    const stream = await new Promise((resolve, reject) => {
      const s = renderToPipeableStream(el, {
        onShellError: reject,
        onError: reject,
        onAllReady: () => resolve(s),
      });
    });
    const text = await readStream(stream);
    expect(text).to.contain('<div>Rocky</div>')
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

async function readStream(stream) {
  const readable = createReadableStream(stream);
  const buffers = [];
  for await (const chunk of readable) {
    buffers.push(chunk);
  }
  return Buffer.concat(buffers).toString();
}

function createReadableStream(input) {
  async function* generate() {
    const buffer = [];
    let started = false, ended = false;
    let dataReady;
    const writable = {
      write(data) {
        buffer.push(Buffer.from(data));
        dataReady.resolve(true);
        return true;
      },
      end(data) {
        if (data) {
          buffer.push(Buffer.from(data));
        }
        ended = true;
        dataReady.resolve(false);
        return this;
      },
      on(name, cb) {
        if (name === 'drain' || name === 'close') {
          cb();
        }
      }
    };
    do {
      dataReady = createTrigger();
      if (!started) {
        input.pipe(writable);
        started = true;
      }
      await dataReady;
      while (buffer.length > 0) {
        yield buffer.shift();
      }
    } while (!ended);
  }
  return Readable.from(generate());
}
