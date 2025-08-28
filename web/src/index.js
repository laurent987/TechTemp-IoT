import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/responsive.css';
import App from './App';
import { ChakraProvider } from '@chakra-ui/react';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] SW registered: ', registration);

        // En développement, pas de popup automatique
        if (process.env.NODE_ENV === 'development') {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] SW update available (dev mode)');
                // Pas de popup en dev, juste un log
              }
            });
          });
        } else {
          // En production, popup pour mise à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (window.confirm('Une nouvelle version est disponible. Voulez-vous la charger ?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });
        }
      })
      .catch((error) => {
        console.log('[PWA] SW registration failed: ', error);
      });
  });

  // Écouter les changements de contrôleur SW
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // En dev, pas de reload automatique
    if (process.env.NODE_ENV === 'production') {
      window.location.reload();
    }
  });
} else {
  console.log('[PWA] Service Worker not supported');
}

// Performance monitoring
reportWebVitals(console.log);
