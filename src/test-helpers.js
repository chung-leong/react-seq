import { createElement } from 'react';
import { InspectorContext, PromiseLogger } from './inspector.js';
import { delay } from './utils.js';

export async function withTestRenderer(el, cb, options = {}) {
  const { create, act } = await import('react-test-renderer');
  let renderer;
  const methods = {
    act,
    props: () => { return { renderer } },
    render: (el) => renderer = create(el),
    update: (el) => renderer.update(el),
    unmount: () => renderer?.unmount(),
    clean: () => {},
  };
  return withMethods(el, methods, cb, options);
}

export async function withReactDOM(el, cb, options = {}) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const node = document.body.appendChild(document.createElement('div'));
  const root = createRoot(node);
  const methods = {
    act,
    props: () => { return { root, node } },
    render: (el) => root.render(el),
    update: (el) => root.render(el),
    unmount: () => root.unmount(),
    clean: () => { node.remove() },
  };
  return withMethods(el, methods, cb, options);
}

export async function withMethods(el, methods, cb, options) {
  const {
    timeout = 2000,
  } = options;
  const {
    act,
    props,
    update,
    render,
    unmount,
    clean,
  } = methods;
  // promise that the component is currently waiting for (start with a dummy)
  let lastPromise = Promise.resolve();
  let lastContents = [];
  // function that applies a change, records content changes, and wait for a stoppage event
  async function change(cb) {
    if (!lastPromise) {
      throw new Error('Not awaiting');
    }
    // remember the starting position
    const startIndex = logger.eventLog.length;
    // set up promises
    const returning = logger.newEvent({ type: 'return' });
    const waiting = logger.newEvent({ type: 'await' });
    const rejecting = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms`));
      }, timeout);
    });
    // apply the change
    await act(() => cb());
    const { promise } = await act(() => Promise.race([ returning, waiting, rejecting ]));
    // get new contents from the log
    const contentEvents = logger.eventLog.slice(startIndex).filter(e => e.type === 'content');
    lastContents = contentEvents.map(e => e.content);
    lastPromise = promise;
  }
  // render the element wrapped in a logger
  const logger = new PromiseLogger();
  const provider = createElement(InspectorContext.Provider, { value: logger }, el);
  await change(() => render(provider));
  // suppress "not wrapped in act" messages
  const errorFn = console.error;
  console.error = (...args) => {
    if (typeof(args[0]) !== 'string' || !args[0].includes('was not wrapped in act')) {
      errorFn(...args);
    }
  };
  try {
    await cb({
      ...props?.(),
      logger,
      act,
      update: async (el) => {
        return act(() => update(el));
      },
      unmount: async () => {
        return act(() => unmount());
      },
      awaiting: () => {
        return lastPromise?.name;
      },
      displaying: () => {
        return lastContents[lastContents.length - 1];
      },
      displayed: () => {
        return lastContents;
      },
      showing: () => {
        return lastContents[lastContents.length - 1]?.type;
      },
      shown: () => {
        return lastContents.map(e => e.type);
      },
      resolve: async (value) => {
        return change(() => lastPromise.resolve(value));
      },
      reject: async (err) => {
        return change(() => lastPromise.reject(err));
      },
      timeout: async (err) => {
        if (lastPromise?.timeout < 0) {
          throw new Error('Not expecting timeout');
        }
        return change(() => lastPromise.resolve('timeout'));
      }
    });

  } finally {
    console.error = errorFn;
    await act(() => {
      unmount();
      clean();
    });
  }
}

function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target),
  });
}
