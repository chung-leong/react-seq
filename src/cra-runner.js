import { readFile } from 'fs/promises';
import { runInThisContext } from 'vm';

if (process.argv.length >= 4) {
  const [ buildPath, location, additionalFile ] = process.argv.slice(2);
  render(buildPath, location, additionalFile);
} else {
  console.log(`cra-runner.js <build-path> <location> [<polyfill-path>]`);
}

async function render(buildPath, location, additionalFile) {
  global.location = new URL(location);

  // intercept console functions
  const consoleEntries = [];
  const reporting = [ 'info', 'log', 'debug', 'warn', 'error' ];
  Object.keys(console).forEach(type => {
    console[type] = (...args) => {
      if (reporting.includes(type)) {
        consoleEntries.push({ type, args });
      }
    };
  });

  // intercept uncaught errors too
  process.setUncaughtExceptionCaptureCallback(err => console.error(err));

  // default polyfills
  if (!global.fetch) {
    try {
      const mod = await import('node-fetch');
      global.fetch = mod.default;
    } catch (err) {
    }
  }
  if (!global.AbortController) {
    try {
      const mod = await import('abort-controller');
      global.AbortController = mod['AbortController'];
      global.AbortSignal = mod['AbortSignal'];
    } catch (err) {
    }
  }
  if (!global.globalThis) {
    global.globalThis = global;
  }
  global.self = global;

  // additional polyfills
  if (additionalFile) {
    await import(additionalFile);
  }

  // create fake document object needed by WebPack to import module dynamically
  global.document = createFakeDocument(buildPath);

  // function to be called by client-side code, giving us promise of web stream
  // renderToReadableStream()
  let streamPromise;
  process.send = async (p) => streamPromise = p;

  try {
    // load the HTML file and look for the JS path and look root node
    const htmlPath = `${buildPath}/index.html`;
    const html = await readFile(htmlPath, 'utf8');
    const jsPath = findJSPath(html);
    const wrapper = findRootNode(html);

    // run the script
    await runJSFile(buildPath, jsPath);
    process.stdout.write(wrapper.before);
    try {
      if (!streamPromise) {
        throw new Error('Did not receive a promise from client-side code');
      }
      const stream = await streamPromise;
      // wait for components to all be not suspended
      await stream.allReady;
      for await (const chunk of stream) {
        process.stdout.write(chunk);
      }
    } finally {
      process.stdout.write(wrapper.after);
    }
  } catch (err) {
    console.error(err);
  }
  process.stdout.destroy();

  let exitCode = 0;
  const output = [];
  for (const { type, args } of consoleEntries) {
    for (let [ index, arg ] of args.entries()) {
      if (arg instanceof Error) {
        args[index] = await translateError(arg, buildPath);
      }
    }
    const json = JSON.stringify({ type, args });
    if (!output.includes(json)) {
      output.push(json);
    }
    if (type === 'error') {
      exitCode = 1;
    }
  }
  process.stderr.write(output.join('\n') + '\n');
  process.exit(exitCode);
}

function findJSPath(html) {
  const m = /<script\s+[^>]*?\bsrc="(\/static\/js\/main[^>"]*).*?>/.exec(html);
  if (!m) {
    throw new Error('Cannot find path to JavaScript file in HTML file');
  }
  return m[1];
}

function findRootNode(html) {
  const m = /(<div\s+[^>]*?\bid="root".*?>)(\s*)<\/div>/.exec(html);
  if (!m) {
    throw new Error('Cannot find container node in HTML file');
  }
  const before = html.substr(0, m.index + m[1].length);
  const after = html.substr(m.index + m[1].length + m[2].length);
  return { before, after };
}

async function runJSFile(basePath, src) {
  const filename = basePath + src;
  const code = await readFile(filename, 'utf8');
  try {
    runInThisContext(code, { filename });
  } catch (err) {
    throw err;
  }
}

async function translateError(err, basePath) {
  const object = { error: err.constructor.name, message: err.message };
  const { lineNumber, fileName, columnNumber } = err;
  if (err.stack) {
    const lines = err.stack.split('\n');
    const search = `${basePath}/`;
    const sourceMaps = {};
    for (const line of lines) {
      const index = line.indexOf(search);
      if (index !== -1) {
        const before = line.substr(0, index);
        const after = line.substr(index + search.length);
        let pos = '';
        if (before.endsWith('(') && after.endsWith(')')) {
          pos = after.substr(0, after.length - 1);
        } else if (before.endsWith('at ') && !after.endsWith(')')) {
          pos = after;
        }
        const parts = pos.split(':');
        if (parts.length === 3) {
          const path = `${basePath}/${parts[0]}`;
          const line = parseInt(parts[1]);
          const column = parseInt(parts[2]);
          if (!(path in sourceMaps)) {
            // try to load source map
            try {
              const { SourceMapConsumer } = await import('source-map');
              const raw = await readFile(path + '.map', 'utf8');
              const map = await new SourceMapConsumer(raw);
              sourceMaps[path] = map;
            } catch (err){
              sourceMaps[path] = null;
            }
          }
          const map = sourceMaps[path];
          if (map) {
            const org = map.originalPositionFor({ line, column });
            if (org) {
              if (!object.stack) {
                object.stack = [];
              }
              if (org.name) {
                object.stack.push(`at ${org.name} (${org.source}:${org.line}:${org.column})`);
              } else {
                object.stack.push(`at ${org.source}:${org.line}:${org.column}`);
              }
            }
          }
        }
      }
    }
  }
  return object;
}

function createFakeDocument(basePath) {
  const scripts = [];
  const loadScript = async ({ src, onload, onerror }) => {
    try {
      await runJSFile(basePath, src);
      onload({});
    } catch (err) {
      onerror({ error: err }) ;
    }
  };
  return {
    createElement(tag) {
      if (tag !== 'script') {
        throw new Error('Unsupported operation');
      };
      return {
        parentNode: null,
        getAttribute: function(name) { return this[name] ?? null },
        setAttribute: function(name, value) { this[name] = value },
      };
    },
    getElementsByTagName(tag) {
      if (tag !== 'script') {
        throw new Error('Unsupported operation');
      };
      return scripts;
    },
    head: {
      appendChild(child) {
        child.parentNode = this;
        scripts.push(child);
        loadScript(child);
        return child;
      },
      removeChild(child) {
        const index = scripts.indexOf(child);
        scripts.splice(index, 1);
        return child;
      }
    },
  };
}
