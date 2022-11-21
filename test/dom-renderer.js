import { settings } from '../src/settings.js';
import { withLock } from './error-handling.js';

export async function withReactDOM(cb) {
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
