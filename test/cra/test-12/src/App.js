import logo from './logo.svg';
import './App.css';
import { useSequential, delay } from 'react-seq';

function App() {
  return useSequential(async function*({ fallback, defer }) {
    fallback(<div>Loading...</div>);
    defer(100);
    try {
      for (let i = 1; i <= 10; i++) {
        yield (
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
              <p>
                Iteration #{i}
              </p>
            </header>
          </div>
        );
        await delay(50);
      }
    } finally {
      console.log('finally section');
    }
  });
}

export default App;
