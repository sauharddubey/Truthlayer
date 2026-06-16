self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Purge any caches left by a previous caching service worker. Stale,
      // cached app-shell HTML/JS referenced webpack chunk filenames that no
      // longer exist after a rebuild, causing ChunkLoadError and blank pages.
      if (self.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      await self.clients.claim();
    })()
  );
});

// Intentional no-op fetch handler.
//
// The presence of a fetch listener satisfies the PWA "installable" criteria,
// but we deliberately never call respondWith(). Intercepting requests with a
// naive `respondWith(fetch(event.request))` pass-through breaks Next.js App
// Router navigation (RSC requests) and re-issues cross-origin API/auth calls,
// which made login appear to hang after a successful sign-in. Letting every
// request fall through to the browser's default networking avoids that.
self.addEventListener("fetch", () => {
  // no-op — do not intercept.
});
