import { settings } from '../src/settings.js';
import { withLock } from './error-handling.js';

export async function withReactDOM(cb) {
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
  }
}

export async function withReactStrictMode(cb, delay = 0) {
  await withLock(async () => {
    try {
      settings({ strict_mode_clean_up: delay });
      await withReactDOM(cb);
    } finally {
      settings({ strict_mode_clean_up: NaN });
    }
  });
}

export async function withReactHydration(html, el, cb, timeout = 1000) {
  await withLock(async () => {
    const { hydrateRoot } = await import('react-dom/client');
    const { act } = await import('react-dom/test-utils');
    const node = document.body.appendChild(document.createElement('div'));
    node.innerHTML = html;
    let root;
    try {
      settings({ ssr: 'hydrate', ssr_time_limit: timeout });
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
      settings({ ssr: false, ssr_time_limit: 3000 });
    }
  });
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
