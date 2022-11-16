import { fork } from 'child_process';
import { Readable } from 'stream';

export function renderInChildProc(location, buildPath, options = {}) {
  const {
    timeout = 5000,
    type = 'cra',
    polyfill = '',
    onMessages,
  } = options;
  // spawn a child instance of Node.js to run the code
  const modulePath = (new URL(`${type}-runner.js`, import.meta.url)).pathname;
  const args = [ buildPath, location, polyfill ];
  const child = fork(modulePath, args, { timeout, stdio: 'pipe' });
  // generator function reading from pipes
  async function* retrieve() {
    // read stdout first
    let sent = 0;
    for await (const chunk of child.stdout) {
      yield chunk;
      sent += chunk.length;
    }
    // then stderr
    try {
      const chunks = [];
      for await (const chunk of child.stderr) {
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString().trim();
      const entries = (text) ? text.split('\n').map(l => JSON.parse(l)) : [];
      if (sent > 0) {
        // the HTML has been sent; redirect entries to client-side
        let fnSent = false;
        const reporting = [ 'info', 'log', 'debug', 'warn', 'error' ];
        for (const entry of entries.filter(e => reporting.includes(e.type))) {
          if (!fnSent) {
            // output function for outputting entries to console
            function __relay_ssr_msg(e) {
              let type = e.type;
              let args = e.args.map(arg => {
                if (arg && arg.error) {
                  let msg = arg.error + ' encountered during SSR; ' + arg.message;
                  if (arg.stack) {
                    msg += '\n' + arg.stack.map(line => '    ' + line).join('\n');
                  }
                  const err = new Error(msg);
                  err.stack = null;
                  return err;
                }
                return arg;
              });
              console[type].apply(null, args);
            }
            yield `\n<script>\n${__relay_ssr_msg.toString()}\n</script>\n`;
            fnSent = true;
          }
          yield `<script>__relay_ssr_msg(${JSON.stringify(entry)})</script>\n`;
        }
      } else {
        // just throw up a 500 internal error
        const err = entries.find(e => e.type === 'error' && e.args[0]?.error);
        throw new Error(err?.args[0].message ?? 'Error encountered during SSR');
      }
      if (onMessages) {
        onMessages(entries);
      }
    } catch (err) {
      throw err;
    }
  }
  // convert generator to Readable stream
  return Readable.from(retrieve());
}
