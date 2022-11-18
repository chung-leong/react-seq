import { renderToReadableStream } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { settings } from './settings.js';
import { delay } from './utils.js';

export function hydrateRootReactSeq(container, element) {
  let root;
  try {
    settings({ ssr: 'hydrate' });
    root = hydrateRoot(container, element);
    return root;
  } finally {
    // wait for the root to finish its work
    waitForRoot(root).then(() => settings({ ssr: false }));
  }
}

export async function renderToInnerHTML(element, node) {
  try {
    settings({ ssr: 'server' });
    const stream = await renderToReadableStream(element);
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
    node.innerHTML = html;
  } finally {
    settings({ ssr: false });
  }
}

export function renderToServer(element) {
  (async () => {
    try {
      settings({ ssr: 'server' });
      const promise = renderToReadableStream(element);
      process.send(promise);
      const stream = await promise;
      await stream.allReady;
    } finally {
      settings({ ssr: false });
    }
  })();
}

export async function waitForRoot(root) {
  while (root?._internalRoot.callbackNode) {
    await delay(0);
  }
}

export function hasSuspended(root) {
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

export {
  hydrateRootReactSeq as hydrateRoot
};
