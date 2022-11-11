import { renderToReadableStream } from 'react-dom/server';

export async function renderToInnerHTML(element, node) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  // TODO
}

export async function renderToServer(element) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  global?.send(stream);
}
