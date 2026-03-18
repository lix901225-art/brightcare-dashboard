// BrightCare Parent — Enhanced Service Worker
// PWA offline support with API caching, offline fallback, and background sync

const CACHE_VERSION = "v2";
const STATIC_CACHE = `brightcare-static-${CACHE_VERSION}`;
const API_CACHE = `brightcare-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `brightcare-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/parent",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline",
];

// API routes to cache for offline access
const CACHEABLE_API_PATTERNS = [
  /\/api\/proxy\/children$/,
  /\/api\/proxy\/attendance/,
  /\/api\/proxy\/daily-reports/,
  /\/api\/proxy\/announcements/,
  /\/api\/proxy\/messages$/,
  /\/api\/proxy\/notifications/,
  /\/api\/proxy\/billing\/invoices/,
  /\/api\/proxy\/rooms$/,
  /\/api\/proxy\/tenant\/current/,
];

const MAX_API_CACHE_AGE = 30 * 60 * 1000; // 30 minutes
const MAX_IMAGE_CACHE_ITEMS = 100;

// ─── Install ───

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate ───

self.addEventListener("activate", (event) => {
  const validCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch strategies ───

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith("/api/proxy/")) {
    if (isCacheableApi(url.pathname)) {
      event.respondWith(networkFirstWithCache(request, API_CACHE));
    }
    return;
  }

  // Image requests: cache-first with network fallback
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithNetwork(request, IMAGE_CACHE));
    return;
  }

  // Navigation: network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/offline"))
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ─── Strategies ───

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "offline", message: "You are offline. Cached data may be available." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      // Evict old entries
      trimCache(cacheName, MAX_IMAGE_CACHE_ITEMS);
    }
    return response;
  } catch {
    return new Response("", { status: 404 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("", { status: 404 });
}

// ─── Helpers ───

function isCacheableApi(pathname) {
  return CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === "image" ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)
  );
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    for (let i = 0; i < keys.length - maxItems; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ─── Background sync for queued actions ───

self.addEventListener("sync", (event) => {
  if (event.tag === "brightcare-sync") {
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  // Open IndexedDB to check for queued actions
  const db = await openDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  const allKeys = await getAllKeys(store);

  for (const key of allKeys) {
    const item = await getItem(store, key);
    if (!item) continue;

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (response.ok) {
        store.delete(key);
      }
    } catch {
      // Still offline, keep in queue
      break;
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("brightcare-offline", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("queue", { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllKeys(store) {
  return new Promise((resolve) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
}

function getItem(store, key) {
  return new Promise((resolve) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

// ─── Push notifications ───

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "BrightCare", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: data.url || "/parent" },
        tag: data.tag || "brightcare-notification",
      })
    );
  } catch {
    // ignore malformed push
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/parent";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
