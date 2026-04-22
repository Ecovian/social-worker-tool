import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const basePath = import.meta.env.BASE_URL || '/';
const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const serviceWorkerUrl = `${normalizedBasePath}sw.js`;
      await navigator.serviceWorker.register(serviceWorkerUrl, {
        scope: normalizedBasePath,
      });
    } catch {
      // Ignore service worker registration failures in unsupported environments.
    }
  });
}
