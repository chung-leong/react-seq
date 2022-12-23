import { useRouter, useRoute, arrayProxy } from './array-router/index.js';
import { useSequential, throwing, delay } from 'react-seq';
import './css/App.css';

export function App({ main }) {
  const provide = useRouter({ allowExtraParts: true });
  return provide(() => {
    return (
      <div className="App">
        <MainSequence main={main} />
      </div>
    );
  });
}

function MainSequence({ main }) {
  const [ parts, query, rMethods ] = useRoute();
  return useSequential((sMethods) => {
    const methods = { ...rMethods, ...sMethods };
    const { manageEvents, trap, reject, mount } = methods;
    const [ on, eventual ] = manageEvents();
    mount().then(() => {
      trap('change', (reason, parts, query, href) => {
        const err = new DetourPending(reason, parts, query, href);
        on.detour(throwing(err));
        return err.promise;
      });
      trap('error', (err) => {
        reject(err);
        return false;
      });
    });
    methods.handleError = async function*(err) {
      if (err instanceof DetourPending) {
        await err.proceed();
      } else {
        yield <ScreenError error={err} onConfirm={on.confirmation} />;
        await eventual.confirmation;
      }
    };
    methods.manageRoute = (def, offset) => {
      const proxy = arrayProxy(parts, def, offset);
      return [ proxy, query ];
    };
    return main(methods);
  }, [ parts, query, rMethods ]);
}

export class DetourPending extends Error {
  constructor(reason, parts, query, href) {
    super(`Detouring to ${href} (${reason})`);
    this.reason = reason;
    this.parts = parts;
    this.query = query;
    this.href = href;
    this.promise = new Promise(r => this.resolve = r);
  }

  async proceed() {
    await this.resolve();
  }
}

function ScreenError({ error }) {
  return <div className="error">{error.message}</div>;
}
