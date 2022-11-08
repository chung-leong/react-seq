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
      end(data) {
        if (data) {
          buffer.push(Buffer.from(data));
        }
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
