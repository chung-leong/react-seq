import { useSequentialRouter, arrayProxy } from 'array-router';
import { useSequential } from 'react-seq';
import { Crossfade } from './Crossfade.js';
import './css/App.css';

export function App() {
  const [ parts, query, rMethods, { createContext, createBoundary } ] = useSequentialRouter();
  return createContext(useSequential(async (sMethods) => {
    const methods = { ...rMethods, ...sMethods };
    const { fallback, reject, mount, wrap, trap } = methods;
    fallback(<Loading />);
    wrap(children => createBoundary(children));
    await mount();
    trap('error', (err) => {
      reject(err);
      return false;
    });
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
    methods.manageRoute = (def) => {
      const proxy = arrayProxy(parts, def);
      return [ proxy, query ];
    };
    methods.transition = new Crossfade(methods);
    const { main } = await import('./main.js');
    return main({}, methods);
  }, [ parts, query, rMethods ]));
}

function Loading() {
  return (
    <div className="Loading">
      <div className="spinner" />
    </div>
  );
}
