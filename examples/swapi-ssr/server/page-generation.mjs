import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Script } from 'vm';
import { renderIntoReadableStream } from 'react-seq/server';
import fetch from 'node-fetch';
import AbortController from 'abort-controller';

export async function generateHTML({ location, buildPath, timeout = 5000 }) {
  let stream = null;
  // load the HTML to get the path to the JS file and the HTML tags that wrap the app
  const htmlPath = resolve(buildPath, 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const jsPath = findJSPath(html);
  const wrapper = findRootNode(html);
  // load the code
  const codePath = resolve(buildPath, jsPath.substr(1));
  const code = await readFile(codePath, 'utf8');
  const script = new Script(code);
  // set up context for VM
  // app is expected to call global.renderToStream()
  const renderToStream = (element) => {
    stream = renderIntoReadableStream(element, wrapper);
  };
  const context = { AbortController, fetch, location, renderToStream };
  context.self = context;
  script.runInNewContext(context, { timeout });
  if (!stream) {
    throw new Error('No call was made to renderToStream()');
  }
  return stream;
}

function findJSPath(html) {
  const m = /<script\s+[^>]*\bsrc="([^>"]*).*?>/.exec(html);
  if (!m) {
    throw new Error('Cannot find path to JavaScript script in HTML file');
  }
  return m[1];
}

function findRootNode(html) {
  const m = /(<div\s+[^>]*\bid="root".*?>)(\s*)<\/div>/.exec(html);
  if (!m) {
    throw new Error('Cannot find container node in HTML file');
  }
  const before = html.substr(0, m.index + m[1].length);
  const after = html.substr(m.index + m[1].length + m[2].length);
  return { before, after };
}
