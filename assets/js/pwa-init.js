/**
 * Hyrost PWA Initialization & Auto-Update Handler
 * v30 — Includes force-cleanup of old service worker caches
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    // Unregister SEMUA service worker lama dulu, lalu register yang baru
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      const unregisterAll = registrations.map((reg) => reg.unregister());
      return Promise.all(unregisterAll);
    }).then(() => {
      // Bersihkan semua cache lama
      if ('caches' in window) {
        return caches.keys().then((names) =>
          Promise.all(names.map((name) => caches.delete(name)))
        );
      }
    }).then(() => {
      // Register service worker baru (v30 — dengan fix stealth token)
      return navigator.serviceWorker.register('/sw.js?v=30');
    }).then((reg) => {
      if (reg) reg.update().catch(() => {});
      console.log('[PWA] Service Worker v30 registered successfully.');
    }).catch((err) => {
      console.warn('[PWA] SW register error:', err);
    });
  });
})();
