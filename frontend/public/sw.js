self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  // Pass-through handler: fetches resources over network directly.
  // This fulfills the custom service worker install criteria.
  e.respondWith(fetch(e.request));
});
