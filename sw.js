// Hyrost Service Worker for PWA Offline Caching
const CACHE_NAME = 'hyrost-v12';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/dashboard.css',
  '/dashboard.js',
  '/styles.css',
  '/assets/images/hyrost.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
