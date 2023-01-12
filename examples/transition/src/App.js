import { useSequentialRouter, arrayProxy } from 'array-router';
import { useSequential } from 'react-seq';
import Crossfade from './Crossfade.js';
import './css/App.css';

export default function App() {
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
    trap('detour', (err) => {
      reject(err);
      return true;
    });
    methods.manageRoute = (def) => {
      const proxy = arrayProxy(parts, def);
      return [ proxy, query ];
    };
    methods.transition = new Crossfade(methods);
    const { default: main } = await import('./main.js');
    return main({}, methods);
  }, [ parts, query, rMethods, createBoundary ]));
}

function Loading() {
  return (
    <div className="Loading">
      <div className="spinner" />
    </div>
  );
}
