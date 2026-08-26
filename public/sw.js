// MARKET AI - Progressive Web App Service Worker (High-Speed Local Cache)
const CACHE_NAME = "market-ai-pwa-v2";
const PRECACHE_ASSETS = [
  "/",
  "/favicon.ico",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/logo-market-ai.jpg",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[PWA] Cache pre-warming avisos:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas POST ou server functions /_server
  if (event.request.method !== "GET" || url.pathname.startsWith("/_server") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Stale-While-Revalidate para máxima velocidade instantânea (0-5ms)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Retorna o cache local imediatamente se existir; caso contrário aguarda a rede
      return cachedResponse || fetchPromise;
    })
  );
});
