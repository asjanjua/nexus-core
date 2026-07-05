/*
 * NexusAI Mission Control — service worker (Phase 0 PWA).
 *
 * Deliberately conservative because this is an authenticated, evidence-grounded
 * product. The rules below exist to make the app INSTALLABLE without ever
 * serving stale or cross-user content:
 *
 *   - /api/*            -> network-only. Never cached. Prevents serving one
 *                          user's data (or a logged-out shell) to another.
 *   - navigations (HTML)-> network-first, NOT cached. On failure, show the
 *                          static offline page. Avoids stale authed shells.
 *   - /_next/static/*,
 *     /icons/*, manifest -> cache-first (immutable / safe static assets).
 *
 * Bump CACHE_VERSION on any change here to force old caches out.
 */

const CACHE_VERSION = "nexus-pwa-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Minimal precache: the offline fallback plus core icons/manifest.
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET; never interfere with POST/PUT/etc.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests. Leave cross-origin (Clerk, Stripe,
  // analytics, LLM providers) entirely alone.
  if (url.origin !== self.location.origin) return;

  // API: network-only. Do not touch the cache.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations (HTML documents): network-first, fall back to offline page.
  // Never cache the response — authed shells must not be reused.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Safe static assets: cache-first, then populate cache in the background.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
  // Everything else: let the network handle it (default behaviour).
});
