/* eslint-disable no-restricted-globals */
// TechTemp IoT Service Worker
// Version 1.2.0 - SVG icons support

const CACHE_NAME = 'techtemp-v1.2';
const OFFLINE_URL = '/offline.html';

// Ressources critiques à mettre en cache (App Shell)
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-base.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-72.png',
  '/icons/checkmark.png',
  '/icons/xmark.png',
  OFFLINE_URL
];

// URLs de l'API à mettre en cache avec stratégie Network First
const API_CACHE_PATTERNS = [
  /^https:\/\/us-central1-techtemp-49c7f\.cloudfunctions\.net\//,
  /^https:\/\/api\.open-meteo\.com\//
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache ouvert');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force l'activation immédiate
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de la mise en cache:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Supprimer les anciens caches
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Prendre le contrôle de tous les clients
        return self.clients.claim();
      })
  );
});

// Stratégie de récupération des ressources
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP/HTTPS
  if (!['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  // Stratégie pour les API (Network First avec fallback cache)
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Stratégie pour les ressources statiques (Cache First)
  if (request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Stratégie pour la navigation (Network First avec fallback offline)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Par défaut: Network First
  event.respondWith(networkFirstStrategy(request));
});

// Stratégie Network First (pour les APIs)
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Mettre en cache les réponses valides
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, checking cache for:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Stratégie Cache First (pour les ressources statiques)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('[SW] Cache et network failed pour:', request.url);
    throw error;
  }
}

// Stratégie pour la navigation avec page offline
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Network failed pour navigation, showing offline page');
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await cache.match(OFFLINE_URL);
    return offlineResponse || new Response('Offline', { status: 200 });
  }
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Push reçu:', event);

  const options = {
    body: 'Nouvelle alerte température !',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir détails',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/xmark.png'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.data = { ...options.data, ...payload.data };
    } catch (e) {
      options.body = event.data.text() || options.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification('TechTemp IoT', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Ouvrir ou focuser l'application
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focuser
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }

        // Sinon, ouvrir une nouvelle fenêtre
        return clients.openWindow('/');
      })
  );
});

// Synchronisation en arrière-plan (pour futures fonctionnalités)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'temperature-sync') {
    event.waitUntil(doTemperatureSync());
  }
});

async function doTemperatureSync() {
  // Future: synchroniser les données de température
  console.log('[SW] Synchronisation des températures...');
}

// Gestion des messages depuis l'app
self.addEventListener('message', (event) => {
  console.log('[SW] Message reçu:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
