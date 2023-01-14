#!/usr/bin/env node
import { useSequential } from 'react-seq';
import { render } from 'ink';
import main from './main.jsx';

function App() {
  return useSequential(main, []);
}

render(<App />);
