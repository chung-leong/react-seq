import './css/App.css';
import { lazy, Suspense } from 'react';
import { useRouter } from 'array-router';
import NavBar from './NavBar.js';
import Loading from './Loading.js';
import Welcome from './Welcome.js';

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
const ErrorScreen = lazy(() => import('./ErrorScreen.js'));

export default function App() {
  const provide = useRouter({ trailingSlash: true });
  return (
    <div className="App">
      <div>
        <NavBar />
        <div className="contents">
          <Suspense fallback={<Loading />}>
            {provide((parts, query, { throw404 }) => {
              try {
                const [ section, id ] = parts;
                switch (section) {
                  case undefined:
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
                    throw404();
                }
              } catch (err) {
                return <ErrorScreen error={err} />;
              }
            })}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
