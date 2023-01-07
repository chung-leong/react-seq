import { useSequentialState } from 'react-seq';
import logo from './logo.svg';
import './css/App.css';

export default function App() {
  const godMode = useKonamiCode();
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
          {godMode?
            <p>
              Project outsourced to India. You win!
            </p>
            :
            <p>
              Edit <code>src/App.js</code> and save to reload.
            </p>
          }
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

function useKonamiCode() {
  return useSequentialState(async function*({ initial, mount, manageEvents, signal }) {
    initial(false);
    const [ on, eventual ] = manageEvents();
    await mount();
    window.addEventListener('keydown', on.key.filter(e => e.key), { signal });
    while (!(
         await eventual.key.value() === 'ArrowUp'
      && await eventual.key.value() === 'ArrowUp'
      && await eventual.key.value() === 'ArrowDown'
      && await eventual.key.value() === 'ArrowDown'
      && await eventual.key.value() === 'ArrowLeft'
      && await eventual.key.value() === 'ArrowRight'
      && await eventual.key.value() === 'ArrowLeft'
      && await eventual.key.value() === 'ArrowRight'
      && await eventual.key.value() === 'b'
      && await eventual.key.value() === 'a'
    ));
    yield true;
  }, []);
}
