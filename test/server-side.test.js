import { expect } from 'chai';
import { createElement, Suspense, lazy } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { withServerSideRendering, withReactDOM } from './dom-renderer.js';
import { createSteps } from './step.js';
import { createErrorBoundary, caughtAt, withSilentConsole } from './error-handling.js';
import { createWriteStream } from 'fs';
import { delay, Abort } from '../index.js';
import { isAbortError, createTrigger } from '../src/utils.js';
import { settings } from '../src/settings.js';

import {
  useSequential,
  useSequentialState,
} from '../index.js';
import {
  renderInChildProc,
} from '../server.js';
import {
  __relay_ssr_msg,
} from '../src/server-side.js';

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
    await withReactDOM(async ({ unmount, node }) => {
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
      unmount();
      const el = createElement(TestComponent);
      node.innerHTML = '<!--$--><div>Rocky</div><!--/$-->';
      settings({ ssr: 'hydrate', ssr_time_limit: 1000 });
      const root = hydrateRoot(node, el);
      settings({ ssr: false, ssr_time_limit: 3000 });
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
    await withReactDOM(async ({ unmount, node }) => {
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
      unmount();
      node.innerHTML = '<div>Cow</div>';
      const el = createElement(TestComponent);
      settings({ ssr: 'hydrate', ssr_time_limit: 1000 });
      const root = hydrateRoot(node, el);
      await waitForHydration(root);
      settings({ ssr: false, ssr_time_limit: 3000 });
      expect(node.innerHTML).to.contain('<div>Cow</div>');
      await assertions[0].done();
      await steps[1];
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
    await withReactDOM(async ({ unmount, node }) => {
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
      unmount();
      node.innerHTML = '<!--$--><div>Pig</div><!--/$-->';
      const el = createElement(TestComponent);
      settings({ ssr: 'hydrate', ssr_time_limit: 1000 });
      const root = hydrateRoot(node, el);
      await waitForHydration(root);
      settings({ ssr: false, ssr_time_limit: 3000 });

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
  it('should fail when it cannot find the root node', async function() {
    const buildPath = resolve('./cra/test-1-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    let error;
    try {
      const html = await readStream(stream);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').with.property('message').that.contains('container node');
  })
  it('should fail when it cannot even find the HTML file', async function() {
    const buildPath = resolve('./cra/test-2-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    let error;
    try {
      const html = await readStream(stream);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').with.property('message').that.contains('no such file');
  })
  it('should fail when the App is not design for SSR', async function() {
    const buildPath = resolve('./cra/test-3-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    let error;
    try {
      const html = await readStream(stream);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').with.property('message').that.contains('document.getElementById');
  })
  it('should correctly render a simple example app', async function() {
    const buildPath = resolve('./cra/test-4/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    const html = await readStream(stream);
    expect(html).to.contain('Learn React');
  })
  it('should receive log messages and errors from app', async function() {
    const buildPath = resolve('./cra/test-5/build');
    let messages;
    const stream = renderInChildProc('http://example.test/', buildPath, { onMessages: (m) => messages = m });
    const html = await readStream(stream);
    expect(html).to
      .contain('<script>')
      .contain('__relay_ssr_msg')
      .contain('Rendering to server');
    expect(messages).to.be.an('array');
    const errMsg = messages.find(m => m.type === 'error');
    expect(errMsg).to.be.an('object');
    expect(errMsg).to.have.property('args');
    const error = errMsg.args[0];
    expect(error).to.have.property('error', 'Error');
    expect(error).to.have.property('stack');
    expect(error.stack[0]).to.contain('App.js:6');
  })
  it('should fail when the module type is bogus', async function() {
    const buildPath = resolve('./cra/test-1-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath, { type: 'bogus' });
    let error;
    try {
      const html = await readStream(stream);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').with.property('message').that.contains('Error encountered during SSR');
  })
  it('should send error to client-side console when the App fails to return a stream', async function() {
    const buildPath = resolve('./cra/test-6-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    let error;
    const html = await readStream(stream);
    expect(html).to
      .contain('</html>')
      .contain('<script>')
      .contain('__relay_ssr_msg')
      .contain('Did not receive a promise from client-side code');
  })
  it('should fail when the JS reference is unexpected', async function() {
    const buildPath = resolve('./cra/test-7-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    let error;
    try {
      const html = await readStream(stream);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').with.property('message').that.contains('path to JavaScript file');
  })
  it('should receive log messages and errors from app whose source maps are missing', async function() {
    const buildPath = resolve('./cra/test-8/build');
    let messages;
    const stream = renderInChildProc('http://example.test/', buildPath, { onMessages: (m) => messages = m });
    const html = await readStream(stream);
    expect(html).to
      .contain('<script>')
      .contain('__relay_ssr_msg')
      .contain('Rendering to server');
    expect(messages).to.be.an('array');
    const errMsg = messages.find(m => m.type === 'error');
    expect(errMsg).to.be.an('object');
    expect(errMsg).to.have.property('args');
    const error = errMsg.args[0];
    expect(error).to.have.property('error', 'Error');
    expect(error).to.not.have.property('stack');
  })
  it('should correctly render an app that uses dynamic import', async function() {
    const buildPath = resolve('./cra/test-9/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    const html = await readStream(stream);
    expect(html).to.contain('Something is better than nothing');
  })
  it('should fail reasonably when dynamically imported code is missing', async function() {
    const buildPath = resolve('./cra/test-10-bad/build');
    const stream = renderInChildProc('http://example.test/', buildPath);
    const html = await readStream(stream);
    expect(html).to
      .contain('__relay_ssr_msg({"type":"error"')
      .contain('Loading chunk')
      .not.contain('Something is better than nothing');
  })
  it('should load polyfill script into app scope', async function() {
    const buildPath = resolve('./cra/test-11/build');
    const polyfill = resolve('./cra/test-11/fake-fetch.js');
    let messages;
    const stream = renderInChildProc('http://example.test/', buildPath, { polyfill, onMessages: m => messages = m });
    const html = await readStream(stream);
    expect(html).to.contain('</html>');
    expect(messages[0]).to.eql({ type: 'log', args: [ 'crappy polyfill' ] });
    expect(messages[1]).to.eql({ type: 'log', args: [ 'http://somewhere/' ] });
    expect(messages[2]).to.have.property('type', 'error');
  })
  it('should fail when syntax error is present in polyfill script', async function() {
    const buildPath = resolve('./cra/test-11/build');
    const polyfill = resolve('./cra/test-11/worse-than-fake.js');
    const stream = renderInChildProc('http://example.test/', buildPath, { polyfill });
    let error;
    try {
      const html = await readStream(stream);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an('error').with.property('message').that.contains('Unexpected token');
  })
  it('should invoke finally section of app', async function() {
    const buildPath = resolve('./cra/test-12/build');
    let messages;
    const stream = renderInChildProc('http://example.test/', buildPath, { onMessages: m => messages = m });
    const html = await readStream(stream);
    expect(html).to
      .contain('</html>')
      .contain('Iteration #<!-- -->10');
    expect(messages[0]).to.eql({ type: 'log', args: [ 'finally section' ] });
  })
})

describe('#__relay_ssr_msg', function() {
  it(`should correctly output a log entry to the console`, async function() {
    const console = {};
    await withSilentConsole(async () => {
      const entry = { type: 'log', args: [ 'Rendering to server' ] };
      __relay_ssr_msg(entry);
    }, console);
    expect(console.log).to.be.an('array');
    expect(console.log[0]).to.equal('%c SSR ');
    expect(console.log[2]).to.equal('Rendering to server');
  })
  it('should not attach label when message is already employing formatting', async function () {
    const console = {};
    await withSilentConsole(async () => {
      const entry = { type: 'log', args: [ '%cRendering to server', 'color: #999' ] };
      __relay_ssr_msg(entry);
    }, console);
    expect(console.log).to.be.an('array').with.lengthOf(2);
    expect(console.log[0]).to.equal('%cRendering to server');
  })
  it(`should correctly output an error to the console`, async function() {
    const console = {};
    await withSilentConsole(async () => {
      const entry = {
        type: 'error',
        args: [
          {
            error: 'Error',
            message: 'Pissing the night away',
            stack: [
              'at App.js:6:10',
              'at c (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:68:43)',
              'at Wc (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:70:252)',
              'at Zc (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:76:88)',
              'at Z (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:72:8)',
              'at Zc (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:76:88)',
              'at Z (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:84:217)',
              'at Uc (../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:96:271)',
              'at ../node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:95:52'
            ]
          }
        ]
      };
      __relay_ssr_msg(entry);
    }, console);
    expect(console.error).to.be.an('array');
    expect(console.error[0]).to.equal('%c SSR ');
    expect(console.error[2]).to.be.an('Error').with.property('message').that
      .contains('App.js:6:10')
      .contains('Pissing the night away')
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

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

export async function waitForHydration(root) {
  // wait hydrateRoot to finish its work
  while (root?._internalRoot.callbackNode) {
    await delay(0);
  }
  // wait for all components to finish hydrating
  while (hydrating(root._internalRoot.current)) {
    await delay(25);
  }

  function hydrating(node) {
    if (node?.memoizedState?.dehydrated) {
      return true;
    }
    for (let c = node.child; c; c = c.sibling) {
      if (hydrating(c)) {
        return true;
      }
    }
    return false;
  }
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
