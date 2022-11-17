import { lazy, Suspense } from 'react';
import logo from './logo.svg';
import './App.css';

const Something = lazy(() => import('./Something.js'));

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <Suspense fallback={<div>Loading</div>}>
          <Something />
        </Suspense>
      </header>
    </div>
  );
}

export default App;
