import { createElement } from 'react';
import { InspectorContext, PromiseLogger } from './inspector.js';
import { delay } from './utils.js';

export async function withTestRenderer(el, cb, options = {}) {
  const {
    timeout = 2000
  } = options;
  const { create, act } = await import('react-test-renderer');
  const logger = new PromiseLogger();
  const provider = createElement(InspectorContext.Provider, { value: logger }, el);
  let renderer;
  try {
    let lastPromise = (await stoppage(logger, act, timeout, () => renderer = create(provider))).promise;
    await cb({
      renderer,
      logger,
      update: async (el) => {
        return act(() => renderer.update(el));
      },
      unmount: async () => {
        return act(() => renderer.unmount());
      },
      awaiting: () => {
        return lastPromise?.name;
      },
      resolve: async (value) => {
        if (!lastPromise) {
          throw new Error('Not awaiting');
        }
        lastPromise = (await stoppage(logger, act, timeout, () => lastPromise.resolve(value))).promise;
      },
      reject: async (err) => {
        if (!lastPromise) {
          throw new Error('Not awaiting');
        }
        lastPromise = (await stoppage(logger, act, timeout, () => lastPromise.reject(err))).promise;
      },
      timeout: async (err) => {
        if (!lastPromise) {
          throw new Error('Not awaiting');
        }
        if (!(lastPromise.timeout >= 0)) {
          throw new Error('Not expecting timeout');
        }
        lastPromise = (await stoppage(logger, act, timeout, () => lastPromise.resolve('timeout'))).promise;
      }
    });
  } finally {
    renderer.unmount();
  }
}

export async function withReactDOM(el, cb, options = {}) {
  const {
    timeout = 2000,
    ...jsDOMOpts
  } = options;
  if (typeof(window) !== 'object' && typeof(global) === 'object') {
    return withJSDOM(async () => withReactDOM(el, cb), jsDOMOpts);
  }
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const node = document.body.appendChild(document.createElement('div'));
  const logger = new PromiseLogger();
  const provider = createElement(InspectorContext.Provider, { value: logger }, el);
  const root = createRoot(node);
  // suppress "not wrapped in act" messages
  const errorFn = console.error;
  console.error = (...args) => {
    if (typeof(args[0]) !== 'string' || !args[0].includes('was not wrapped in act')) {
      errorFn(...args);
    }
  };
  try {
    let lastPromise = (await stoppage(logger, act, timeout, () => root.render(provider))).promise;
    await cb({
      node,
      root,
      logger,
      update: async (el) => {
        return act(() => root.render(el));
      },
      unmount: async () => {
        return act(() => root.unmount());
      },
      awaiting: () => {
        return lastPromise?.name;
      },
      resolve: async (value) => {
        if (!lastPromise) {
          throw new Error('Not awaiting');
        }
        lastPromise = (await stoppage(logger, act, timeout, () => lastPromise.resolve(value))).promise;
      },
      reject: async (err) => {
        if (!lastPromise) {
          throw new Error('Not awaiting');
        }
        lastPromise = (await stoppage(logger, act, timeout, () => lastPromise.reject(err))).promise;
      },
      timeout: async (err) => {
        if (!lastPromise) {
          throw new Error('Not awaiting');
        }
        if (!(lastPromise.timeout >= 0)) {
          throw new Error('Not expecting timeout');
        }
        lastPromise = (await stoppage(logger, act, timeout, () => lastPromise.resolve('timeout'))).promise;
      }
    });
  } finally {
    root.unmount();
    node.remove();
    console.error = errorFn;
  }
}

async function stoppage(logger, act, ms, cb) {
  const returning = logger.newEvent({ type: 'return' });
  const waiting = logger.newEvent({ type: 'await' });
  const timeout = delay(ms).then(() => { throw new Error(`Timeout after ${ms}ms`) });
  await act(() => cb());
  const event = await act(() => Promise.race([ returning, waiting, timeout ]));
  await act(() => {});
  return event;
}

export async function withJSDOM(cb, options) {
  const { JSDOM } = await import('jsdom');
  const jsdom = new JSDOM('<!doctype html><html><body></body></html>', options);
  const { window } = jsdom;
  const keysBefore = Object.keys(global);
  global.globalThis = window;
  global.window = window;
  global.document = window.document;
  global.navigator = { userAgent: 'node.js' };
  global.requestAnimationFrame = function (callback) {
    return setTimeout(callback, 0);
  };
  global.cancelAnimationFrame = function (id) {
    clearTimeout(id);
  };
  global.jsdom = jsdom;
  global.IS_REACT_ACT_ENVIRONMENT = true
  copyProps(window, global);
  try {
    await cb();
  } finally {
    const keys = Object.keys(global);
    for (const key of keys.slice(keysBefore.length)) {
      delete global[key];
    }
    global.globalThis = global;
  }
}

function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target),
  });
}
