const CACHE_NAME = "satu-data-wajo-static-v2";
const OFFLINE_URL = "/offline.html";
const STATIC_PREFIXES = ["/icons/", "/_next/static/"];
const MAX_CACHED_ASSETS = 120;
const MAX_CACHEABLE_ASSET_BYTES = 2 * 1024 * 1024;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("satu-data-wajo-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimStaticCache(cache) {
  const requests = await cache.keys();
  const assetRequests = requests.filter((request) => {
    const pathname = new URL(request.url).pathname;
    return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  });
  const excess = assetRequests.length - MAX_CACHED_ASSETS;
  if (excess > 0) {
    // Cache.keys() preserves insertion order in supported browsers; remove the
    // oldest cached chunks first. Hashed Next.js asset URLs are immutable.
    await Promise.all(
      assetRequests.slice(0, excess).map((request) => cache.delete(request)),
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache HTML, API responses, authenticated pages, or user-specific data.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(OFFLINE_URL)) || Response.error();
        } catch {
          return Response.error();
        }
      }),
    );
    return;
  }

  const isStaticAsset = STATIC_PREFIXES.some((prefix) =>
    url.pathname.startsWith(prefix),
  );
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        const cacheControl = (
          response.headers.get("cache-control") || ""
        ).toLowerCase();
        const responseLengthHeader = response.headers.get("content-length");
        const responseLength =
          responseLengthHeader === null ? NaN : Number(responseLengthHeader);
        const immutable = cacheControl.includes("immutable");
        const storable =
          response.ok &&
          response.type === "basic" &&
          immutable &&
          !cacheControl.includes("no-store") &&
          Number.isSafeInteger(responseLength) &&
          responseLength > 0 &&
          responseLength <= MAX_CACHEABLE_ASSET_BYTES;

        if (storable) {
          try {
            await cache.put(request, response.clone());
            await trimStaticCache(cache);
          } catch {
            // Storage/quota failures must not break a successful asset request.
          }
        }
        return response;
      } catch {
        return Response.error();
      }
    }),
  );
});
