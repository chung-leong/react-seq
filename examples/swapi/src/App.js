import './css/App.css';
import { Suspense, lazy } from 'react';
import { useRoutes } from '@patched/hookrouter';
import NavBar from './NavBar.js';
import Loading from './Loading.js';
import ErrorBoundary from './ErrorBoundary.js';
import Welcome from './Welcome.js';

const routes = {
    '/': () => [ Welcome ],
    '/test/': () => [ lazy(() => import('./Test.js')) ],
    '/people/?': () => [ lazy(() => import('./CharacterList.js')) ],
    '/people/:id/?': (props) => [ lazy(() => import('./Character.js')), props ],
    '/*': () => [ lazy(() => import('./NotFound.js')) ],
};

export default function App() {
  const [ Component, props ] = useRoutes(routes);
  return (
    <div className="App">
      <div>
        <NavBar/>
        <ErrorBoundary>
          <div className="contents">
            <Suspense fallback={<Loading/>}>
              <Component {...props}/>
            </Suspense>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
