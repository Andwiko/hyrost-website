/**
 * Hyrost PWA Initialization & Auto-Update Handler
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js?v=20')
      .then((reg) => {
        // Automatically check for new updates
        if (reg) {
          reg.update().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('[PWA] SW register error:', err);
      });
  });
})();
