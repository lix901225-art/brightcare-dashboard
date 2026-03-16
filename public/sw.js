// BrightCare Parent — Service Worker
// Provides PWA installability and basic cache-first for static assets

const CACHE_NAME = "brightcare-parent-v1";
const STATIC_ASSETS = ["/parent", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and API requests — always go to network
  if (request.method !== "GET" || request.url.includes("/api/")) return;

  // For navigation requests (HTML pages), try network first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/parent"))
    );
    return;
  }

  // For static assets, try cache first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
