import { StrictMode } from 'react';
import App from './App.js';
import reportWebVitals from './reportWebVitals';
import { renderToInnerHTML, hydrateRoot, renderToServer, hasSuspended } from 'react-seq/client';
import { delay } from 'react-seq';

const app = <StrictMode><App /></StrictMode>;
if (typeof(window) === 'object') {
  const container = document.getElementById('root');
  (async () => {
    if (process.env.NODE_ENV === 'development') {
      await renderToInnerHTML(app, container);
    }
    const root = hydrateRoot(container, app);
    reportWebVitals();

    for (;;) {
      if (!hasSuspended(root)) {
        document.body.classList.add('csr');
        break;
      }
      await delay(50);
    }
  })();
} else {
  renderToServer(app);
}
