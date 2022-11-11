import { renderToReadableStream } from 'react-dom/server';

export async function renderToInnerHTML(element, node) {
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
}

export async function renderToServer(element) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  global?.send(stream);
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
