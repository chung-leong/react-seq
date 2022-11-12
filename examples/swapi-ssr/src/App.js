import './css/App.css';
import { useState, useMemo, useEffect, lazy, Suspense, startTransition } from 'react';
import NavBar from './NavBar.js';
import Loading from './Loading.js';
import Welcome from './Welcome.js';
import ErrorBoundary from './ErrorBoundary.js';

const Character = lazy(() => import('./Character.js'));
const CharacterList = lazy(() => import('./CharacterList.js'));
const Film = lazy(() => import('./Film.js'));
const FilmList = lazy(() => import('./FilmList.js'));
const Planet = lazy(() => import('./Planet.js'));
const PlanetList = lazy(() => import('./PlanetList.js'));
const Species = lazy(() => import('./Species.js'));
const SpeciesList = lazy(() => import('./SpeciesList.js'));
const Starship = lazy(() => import('./Starship.js'));
const StarshipList = lazy(() => import('./StarshipList.js'));
const Vehicle = lazy(() => import('./Vehicle.js'));
const VehicleList = lazy(() => import('./VehicleList.js'));
const NotFound = lazy(() => import('./NotFound.js'));

export default function App() {
  const location = typeof(window) === 'object' ? window.location : global.location;
  const [ url, setURL ] = useState(() => new URL(location));
  const parts = useMemo(() => url.pathname.substr(1).split('/'), [ url ]);

  useEffect(() => {
    if (typeof(window) === 'object') {
      const onLinkClick = (evt) => {
        const { target, button, defaultPrevented } = evt;
        if (button === 0 && !defaultPrevented) {
          const link = target.closest('A');
          if (link && link.origin === window.location.origin) {
            if (!link.target && !link.download) {
              const url = new URL(link);
              startTransition(() => setURL(url));
              window.history.pushState({}, undefined, url);
              evt.preventDefault();
              evt.stopPropagation();
            }
          }
        }
      };
      const onPopState = (evt) => {
        startTransition(() => setURL(new URL(window.location)));
        evt.preventDefault();
        evt.stopPropagation();
      };
      window.addEventListener('click', onLinkClick);
      window.addEventListener('popstate', onPopState);
      return () => {
        window.removeEventListener('click', onLinkClick);
        window.removeEventListener('popstate', onPopState);
      };
    }
  });

  return (
    <div className="App">
      <div>
        <NavBar />
        <div className="contents">
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              {(() => {
                const [ section, id ] = parts;
                switch (section) {
                  case '':
                    return <Welcome />;
                  case 'people':
                    return (id) ? <Character id={id} /> : <CharacterList />;
                  case 'films':
                    return (id) ? <Film id={id} /> : <FilmList />;
                  case 'planets':
                    return (id) ? <Planet id={id} /> : <PlanetList />;
                  case 'species':
                    return (id) ? <Species id={id} /> : <SpeciesList />;
                  case 'starships':
                    return (id) ? <Starship id={id} /> : <StarshipList />;
                  case 'vehicles':
                    return (id) ? <Vehicle id={id} /> : <VehicleList />;
                  default:
                    return <NotFound />;
                }
              })()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
