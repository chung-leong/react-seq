import { useSequentialRouter, arrayProxy, RouteChangePending } from 'array-router';
import { useSequential } from 'react-seq';
import { Crossfade } from './Crossfade.js';
import './css/App.css';

export { RouteChangePending };

export function App({ main }) {
  const [ parts, query, { createContext, createBoundary, ...rMethods } ] = useSequentialRouter();
  const element = useSequential((sMethods) => {
    const methods = { ...rMethods, ...sMethods };
    const { fallback, manageEvents, trap, reject, mount, wrap } = methods;
    wrap(createBoundary);
    fallback(<ScreenLoading />);
    mount().then(() => {
      let detouring;
      trap('detour', (err) => {
        if (!detouring) {
          detouring = true;
          err.onSettlement = () => detouring = false;
          reject(err);
        } else {
          err.prevent();
        }
        return true;
      });
      trap('error', (err) => {
        reject(err);
        return false;
      });
    });
    methods.handleError = async function*(err) {
      if (err instanceof RouteChangePending) {
        await err.proceed();
      } else {
        const [ on, eventual ] = manageEvents();
        yield <ScreenError error={err} onConfirm={on.confirm} />;
        await eventual.confirm;
      }
    };
    methods.manageRoute = (def, offset) => {
      const proxy = arrayProxy(parts, def, offset);
      return [ proxy, query ];
    };
    methods.transition = new Crossfade(methods);
    return main(methods);
  }, [ parts, query, rMethods ]);
  return createContext(
    <div className="App">
      <div className="top-bar"><a href="/">Start</a></div>
      <div className="content">{element}</div>
    </div>
  );
}

function ScreenError({ error }) {
  return <div className="Screen ScreenError">{error.message}</div>;
}

function ScreenLoading() {
  return (
    <div className="Screen ScreenLoading">
      <div className="spinner" />
    </div>
  );
}
