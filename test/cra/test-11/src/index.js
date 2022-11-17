import React from 'react';
import './index.css';
import App from './App';
import { hydrateRoot, renderToServer } from 'react-seq/client';
import reportWebVitals from './reportWebVitals';

const app = <React.StrictMode><App /></React.StrictMode>;
if (typeof(window) === 'object') {
  const container = document.getElementById('root');
  hydrateRoot(container, app);

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
} else {
  renderToServer(app);
}
