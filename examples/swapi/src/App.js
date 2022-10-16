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
    '/films/?': () => [ lazy(() => import('./FilmList.js')) ],
    '/films/:id/?': (props) => [ lazy(() => import('./Film.js')), props ],
    '/planets/?': () => [ lazy(() => import('./PlanetList.js')) ],
    '/planets/:id/?': (props) => [ lazy(() => import('./Planet.js')), props ],
    '/species/?': () => [ lazy(() => import('./SpeciesList.js')) ],
    '/species/:id/?': (props) => [ lazy(() => import('./Species.js')), props ],
    '/starships/?': () => [ lazy(() => import('./StarshipList.js')) ],
    '/starships/:id/?': (props) => [ lazy(() => import('./Starship.js')), props ],
    '/vehicles/?': () => [ lazy(() => import('./VehicleList.js')) ],
    '/vehicles/:id/?': (props) => [ lazy(() => import('./Vehicle.js')), props ],
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
