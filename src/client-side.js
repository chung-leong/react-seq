import { hydrateRoot } from 'react-dom/client';
import { settings } from './settings.js';
import { delay } from './utils.js';

export function hydrateRootReactSeq(container, element, options) {
  let root;
  try {
    settings({ ssr: 'hydrate' });
    root = hydrateRoot(container, element, options);
    return root;
  } finally {
    waitForCompletion(root).then(() => {
      // set ssr back to false when there are no more suspended nodes
      settings(() => {
        if (!findSuspended(root)) {
          return { ssr: false };
        }
      });
    });
  }
}

export async function renderToInnerHTML(container, element, options) {
  try {
    settings({ ssr: 'server' });
    const { renderToReadableStream } = await import('react-dom/server');
    const stream = await renderToReadableStream(element, options);
    await stream.allReady;
    const reader = stream.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (!done) {
        size += value.length;
        chunks.push(value);
      } else {
        break;
      }
    }
    // merge the chunks together
    const merged = new Uint8Array(size);
    let pos = 0;
    for (const chunk of chunks) {
      merged.set(chunk, pos);
      pos += chunk.length;
    }
    // convert to string
    const converter = new TextDecoder();
    const html = converter.decode(merged);
    container.innerHTML = html;
  } finally {
    settings({ ssr: false });
    // suppress irrelevant warning
    const errorFn = console.error;
    console.error = (...args) => {
      console.error = errorFn;
      if (args.length !== 2 || !args[0].includes('multiple renderers')) {
        console.error(...args);
      }
    };
  }
}

export function renderToServer(element, options) {
  async function render() {
    try {
      settings({ ssr: 'server' });
      const { renderToReadableStream } = await import('react-dom/server');
      const stream = await renderToReadableStream(element, options);
      await stream.allReady;
      return stream;
    } finally {
      settings({ ssr: false });
    }
  };
  process.send(render());
}

export async function waitForHydration(root) {
  // wait for hydrateRoot to finish its work
  await waitForCompletion(root);
  // wait for all components to finish hydrating
  while (findSuspended(root)) {
    await delay(25);
  }
}

async function waitForCompletion(root) {
  while (root?._internalRoot?.callbackNode) {
    await delay(0);
  }
}

function findSuspended(root) {
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
  return hydrating(root._internalRoot.current);
}

export {
  hydrateRootReactSeq as hydrateRoot
};
