import { StrictMode } from 'react';
import App from './App.js';
import reportWebVitals from './reportWebVitals';
import { renderToInnerHTML, renderToServer, hydrateRoot, waitForHydration } from 'react-seq/client';

const app = <StrictMode><App /></StrictMode>;
if (typeof(window) === 'object') {
  const container = document.getElementById('root');
  (async () => {
    if (process.env.NODE_ENV === 'development') {
      // do "SSR" on client side to make it easier to debug code during development
      await renderToInnerHTML(app, container);
    }
    const root = hydrateRoot(container, app);
    // indicate page is partially dynamic
    document.body.classList.add('csr-partial');
    await waitForHydration(root);
    // indicate page is fully dynamic now
    document.body.classList.add('csr');
    reportWebVitals();
  })();
} else {
  renderToServer(app);
}
