import { useState } from 'react';
import { useSequentialRouter, arrayProxy, RouteChangePending } from 'array-router';
import { useSequential } from 'react-seq';
import { Crossfade } from './Crossfade.js';
import './css/App.css';

export { RouteChangePending };

export function App() {
  const [ ready, setReady ] = useState(false);
  const [ parts, query, rMethods, { createContext, createBoundary } ] = useSequentialRouter();
  const element = useSequential(async (sMethods) => {
    const methods = { ...rMethods, ...sMethods };
    const { fallback, manageEvents, reject, mount, unsuspend, trap } = methods;
    fallback(<ScreenLoading />);
    unsuspend(() => setReady(true));
    await mount();
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
    const { main } = await import('./main.js');
    setReady(true);
    return main({}, methods);
  }, [ parts, query, rMethods ]);
  return createContext(createBoundary(<Frame ready={ready}>{element}</Frame>));
}

function Frame({ ready, children }) {
  return (
    <div className={'App ' + (ready ? 'ready' : 'loading')}>
      <div className="top-bar"><a href="/">Start</a></div>
      <div className="content">{children}</div>
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
