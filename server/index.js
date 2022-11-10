import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Readable } from 'stream';
import { renderToPipeableStream } from 'react-dom/server';
import { createTrigger } from '../src/utils.js';

export function renderToReadableStream(element, options = {}) {
  const {
    before = '',
    after = '',
  } = options;
  async function* generate() {
    if (before) {
      yield Buffer.from(before);
    }
    let pipeable;
    await new Promise((resolve, reject) => {
      pipeable = renderToPipeableStream(element, {
        onShellError: reject,
        onError: reject,
        onAllReady: () => resolve(),
      });
    });
    const buffer = [];
    let ended = false;
    let dataReady = createTrigger();
    const writable = {
      write(data) {
        buffer.push(Buffer.from(data));
        dataReady.resolve(true);
        return true;
      },
      end() {
        ended = true;
        dataReady.resolve(false);
        return this;
      },
      on(name, cb) {
        if (name === 'drain' || name === 'close') {
          cb();
        }
        return this;
      }
    };
    pipeable.pipe(writable);
    do {
      await dataReady;
      dataReady = createTrigger();
      while (buffer.length > 0) {
        yield buffer.shift();
      }
    } while (!ended);
    if (after) {
      yield Buffer.from(after);
    }
  }
  return Readable.from(generate());
}

export async function loadCRACode(buildPath) {
  const htmlPath = resolve(buildPath, 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const jsPath = findJSPath(html);
  const wrapper = findRootNode(html);
  // load the code
  const codePath = resolve(buildPath, jsPath.substr(1));
  const code = await readFile(codePath, 'utf8');
  return { code, wrapper };
}

function findJSPath(html) {
  const m = /<script\s+[^>]*\bsrc="(\/static\/js\/[^>"]*).*?>/.exec(html);
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
