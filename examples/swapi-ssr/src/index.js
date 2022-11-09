import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import reportWebVitals from './reportWebVitals';

if (typeof(window) === 'object') {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  reportWebVitals();
} else {
  global?.renderToStream(<App />);
}
