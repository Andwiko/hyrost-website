/**
 * Hyrost Service Worker
 * Smart PWA Cache Engine — Network-First for HTML & Stale-While-Revalidate for Assets
 * Version: 2026-v20
 */

const CACHE_NAME = 'hyrost-v20';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/dashboard.css',
  '/dashboard.js',
  '/styles.css',
  '/favicon.ico',
  '/favicon.png',
  '/assets/images/hyrost.png'
];

// Install: precache essential assets & immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache notice:', err);
      });
    })
  );
});

// Activate: clean up old caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Purging old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy based on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Ignore unsupported schemes (chrome-extension, moz-extension, etc)
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    return;
  }

  const url = new URL(req.url);

  // 1. Never cache non-GET or /api/ requests
  if (req.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

  if (isHTML) {
    // 2. HTML NAVIGATION: Network-First strategy
    // Always fetch fresh HTML from server so updates appear immediately without Shift+F5
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network fails, fall back to cached HTML
          return caches.match(req).then((cached) => {
            return cached || caches.match('/index.html') || caches.match('/');
          });
        })
    );
    return;
  }

  // 3. STATIC ASSETS (CSS, JS, Images, Fonts): Stale-While-Revalidate strategy
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Hyrost Realm', body: event.data ? event.data.text() : 'Pemberitahuan baru dari server.' };
  }

  const title = data.title || 'Hyrost Realm';
  const options = {
    body: data.body || 'Ada aktivitas baru di Hyrost Realm!',
    icon: data.icon || '/assets/images/hyrost.png',
    badge: '/assets/images/hyrost.png',
    data: {
      url: data.url || '/dashboard.html'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

