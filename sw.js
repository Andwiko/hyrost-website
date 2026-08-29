/**
 * Hyrost Service Worker
 * Smart PWA Cache Engine — Network-First for HTML & Stale-While-Revalidate for Assets
 * Version: 2026-v30
 *
 * PENTING: URL dengan query string stealth token (/?=TOKEN) TIDAK di-cache.
 * Server Express yang menangani routing tersebut secara dinamis.
 */

const CACHE_NAME = 'hyrost-v30';

// Hanya cache static assets, BUKAN halaman HTML dinamis
const PRECACHE_ASSETS = [
  '/styles.css',
  '/favicon.ico',
  '/favicon.png',
  '/assets/images/hyrost.png',
  '/dashboard.css',
  '/manifest.json'
];

// Install: precache static assets & immediately activate
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

  // ─── CRITICAL: JANGAN intercept URL dengan stealth token atau query string ───
  // URL seperti /?=pv3Ad, /?=f0rUm, dll. harus langsung ke server Express.
  if (url.search && url.search.length > 1) {
    return; // Biarkan browser fetch langsung ke server, tanpa service worker
  }

  // Jangan intercept: non-GET, /api/, /socket.io/, /uploads/
  if (
    req.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return;
  }

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

  if (isHTML) {
    // HTML NAVIGATION: Selalu Network-First — JANGAN fallback ke index.html
    // karena halaman berbeda punya konten berbeda (dashboard vs forum vs leaderboard)
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Cache hanya halaman root / dan static HTML tanpa query string
            if (!url.search) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseClone);
              });
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline: gunakan cache jika ada, jika tidak tampilkan halaman offline
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            // Hanya fallback ke index.html jika URL memang root
            if (url.pathname === '/' && !url.search) {
              return caches.match('/');
            }
            // Jangan fallback sembarang ke index.html — biarkan error network muncul
            return new Response('<h1>Offline</h1><p>Tidak ada koneksi internet.</p>', {
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // STATIC ASSETS (CSS, JS, Images, Fonts): Stale-While-Revalidate strategy
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
      url: data.url || '/?=pv3Ad'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/?=pv3Ad';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('hyrost') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
