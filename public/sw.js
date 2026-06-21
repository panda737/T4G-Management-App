// Minimal service worker — its only job is to make the app installable
// ("Add to Home Screen" / the install prompt). It deliberately does NOT cache
// app code: every request goes to the network, so users always run the latest
// deploy and we avoid stale-PWA problems.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // No-op: simply having a fetch listener satisfies the installability
  // criteria. We don't call event.respondWith(), so the browser handles the
  // request normally (straight from the network).
});
