import { settings } from '../src/settings.js';
import { withLock } from './error-handling.js';

export async function withReactDOM(cb) {
  if (typeof(window) !== 'object' && typeof(global) === 'object') {
    await withJSDOM(async () => await withReactDOM(cb));
    return;
  }
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const node = document.body.appendChild(document.createElement('div'));
  let root = createRoot(node);
  try {
    await cb({
      render: (el) => act(() => root.render(el)),
      unmount: () => act(() => root.unmount()),
      root,
      node,
      act,
    });
  } finally {
    await act(() => root.unmount());
    node.remove();
  }
}

export async function withServerSideRendering(cb, timeout = 1000) {
  await withLock(async () => {
    let window;
    try {
      settings({ ssr: 'server', ssr_time_limit: timeout });
      window = global.window;
      delete global.window;
      await cb();
    } finally {
      settings({ ssr: false, ssr_time_limit: 3000 });
      global.window = window;
    }
  });
}

export async function withJSDOM(cb) {
  await withLock(async () => {
    const { JSDOM } = await import('jsdom');
    const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
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
      // make sure window is no longer set
      delete global.window;
    }
  });
}

function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target),
  });
}
