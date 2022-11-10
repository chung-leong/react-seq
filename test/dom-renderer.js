import { createTrigger } from '../src/utils.js';

// test that works with JSDOM can't run at the same time
let locked = false;
const lockQueue = [];

async function acquireLock() {
  if (locked) {
    const promise = createTrigger();
    lockQueue.push(promise);
    await promise;
  }
  locked = true;
}

async function releaseLock() {
  locked = false;
  const promise = lockQueue.shift();
  if (promise) {
    promise.resolve();
  }
}

export async function withReactDOM(cb) {
  acquireLock();
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const node = document.body.appendChild(document.createElement('div'));
  const root = createRoot(node);
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
    releaseLock();
  }
}

export async function withReactStrictMode(cb) {
  acquireLock();
  try {
    process.env.REACT_STRICT_MODE = 1;
    await withReactDOM(cb);
  } finally {
    delete process.env.REACT_STRICT_MODE;
    releaseLock();
  }
}

export async function withReactHydration(html, el, cb, timeout = 1000) {
  acquireLock();
  const { hydrateRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const node = document.body.appendChild(document.createElement('div'));
  node.innerHTML = html;
  let root;
  try {
    process.env.REACT_SEQ_SSR = timeout;
    await act(() => root = hydrateRoot(node, el));
    await cb({
      unmount: () => act(() => root.unmount()),
      root,
      node,
      act,
    });
  } finally {
    await act(() => root.unmount());
    node.remove();
    delete process.env.REACT_SEQ_SSR;
    releaseLock();
  }
}

export async function withServerSideRendering(cb, timeout = 1000) {
  acquireLock();
  let window;
  try {
    process.env.REACT_SEQ_SSR = timeout;
    window = global.window;
    delete global.window;
    await cb();
  } finally {
    delete process.env.REACT_SEQ_SSR;
    global.window = window;
    releaseLock();
  }
}
