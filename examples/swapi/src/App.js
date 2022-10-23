import './css/App.css';
import { Suspense, lazy } from 'react';
import NavBar from './NavBar.js';
import Loading from './Loading.js';
import Welcome from './Welcome.js';
import { useRouter, RouteError } from './shift-router.js';

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
const ErrorDisplay = lazy(() => import('./ErrorDisplay'));

export default function App() {
  const { shift, Router, url } = useRouter()
  return (
    <div className="App">
      <div>
        <NavBar />
        <div className="contents">
          <Router>
            <Suspense fallback={<Loading />}>
            {(() => {
              try {
                const section = shift(), id = shift(Number, { empty: true });
                switch (section) {
                  case '':
                    return <Welcome />;
                  case 'people':
                    return (id !== undefined) ? <Character id={id} /> : <CharacterList />
                  case 'films':
                    return (id !== undefined) ? <Film id={id} /> : <FilmList />
                  case 'planets':
                    return (id !== undefined) ? <Planet id={id} /> : <PlanetList />
                  case 'species':
                    return (id !== undefined) ? <Species id={id} /> : <SpeciesList />
                  case 'starships':
                    return (id !== undefined) ? <Starship id={id} /> : <StarshipList />
                  case 'vehicles':
                    return (id !== undefined) ? <Vehicle id={id} /> : <VehicleList />
                  default:
                    throw new RouteError(url);
                }
              } catch (err) {
                return <ErrorDisplay error={err} />
              }
            })()}
            </Suspense>
          </Router>
        </div>
      </div>
    </div>
  );
}
