import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  getFrontendToken,
  FRONTEND_TOKEN_COOKIE,
} from "@/lib/auth/session-cookie";
import {
  createPrivateReadCacheIdentity,
  getOrCreatePrivateReadCache,
  invalidatePrivateReadCache,
} from "@/lib/backend/private-read-cache";

export function backendBaseUrl() {
  return (process.env.BACKEND_API_URL || "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
}

/**
 * A GET shared by layout + page (or by multiple server components) only needs
 * one backend round-trip during this React server render. React cache is
 * request-scoped: it does not retain private data between users/requests.
 * Auth verification is deliberately excluded so its transient-failure retry
 * can make a real second request. Callers can also pass memoize:false when a
 * same-render retry is intentionally required.
 */
const memoizedBackendGet = cache(async (path, auth, fetchCache, headersKey) => {
  return performBackendFetch(path, {
    auth,
    cache: fetchCache,
    headers: new Headers(JSON.parse(headersKey)),
  });
});

export function backendFetch(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const optionKeys = Object.keys(options);
  const hasUnsupportedOptions = optionKeys.some(
    (key) => !["auth", "method", "cache", "headers", "memoize"].includes(key),
  );
  const isAuthVerification = /(?:^|\/)auth\/me(?:\?|$)/.test(String(path));

  if (
    method === "GET" &&
    !options.body &&
    !options.signal &&
    options.memoize !== false &&
    !hasUnsupportedOptions &&
    !isAuthVerification
  ) {
    const headers = new Headers(options.headers || {});
    const headerEntries = [...headers.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return memoizedBackendGet(
      String(path),
      options.auth !== false,
      options.cache || "no-store",
      JSON.stringify(headerEntries),
    );
  }

  return performBackendFetch(path, options);
}

async function performBackendFetch(path, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const method = String(fetchOptions.method || "GET").toUpperCase();
  const allowCrossRequestCache = options.memoize !== false;
  delete fetchOptions.memoize;
  const cookieStore = auth ? await cookies() : null;
  const token = getFrontendToken(cookieStore);
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization"))
    headers.set("Authorization", `Bearer ${token}`);
  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const authHeader = headers.get("Authorization") || "";
  const headerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const effectiveToken = headerToken || token;
  const pathText = String(path);
  const isPrivatePortalRead =
    method === "GET" &&
    auth &&
    !fetchOptions.signal &&
    /^\/api\/v1\/(?:auth\/me|portal(?:\/|$))/.test(pathText) &&
    allowCrossRequestCache;
  const cacheIdentity = isPrivatePortalRead
    ? createPrivateReadCacheIdentity({
        token: effectiveToken,
        path: pathText,
        headers,
      })
    : null;

  // Invalidate on every attempted write. Some 5xx responses can arrive after a
  // database commit, so stale reads should never survive an ambiguous mutation.
  if (auth && method !== "GET" && method !== "HEAD") {
    invalidatePrivateReadCache(effectiveToken);
  }

  const executeRequest = async () => {
    const response = await fetch(
      `${backendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...fetchOptions,
        headers,
        cache: fetchOptions.cache || "no-store",
        redirect: "manual",
      },
    );
    const contentType = response.headers.get("content-type") || "";
    let payload = null;
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      const raw = await response.text().catch(() => "");
      payload = raw ? { message: raw.slice(0, 500) } : null;
    }
    if (!response.ok) {
      const error = new Error(
        payload?.message ||
          payload?.error ||
          `Backend API returned ${response.status}`,
      );
      error.status = response.status;
      error.code = payload?.error || payload?.code || `http_${response.status}`;
      error.errors = payload?.errors || null;
      error.requestId =
        (typeof payload?.request_id === "string" && payload.request_id) ||
        response.headers.get("X-Request-Id") ||
        null;
      const retryAfter = response.headers.get("Retry-After");
      const retryAfterSeconds = retryAfter === null ? NaN : Number(retryAfter);
      const retryAfterDate = retryAfter === null ? NaN : Date.parse(retryAfter);
      const retryDelay = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : retryAfterDate - Date.now();
      error.retryAfterMs = Number.isFinite(retryDelay)
        ? Math.min(60_000, Math.max(0, retryDelay))
        : null;
      throw error;
    }
    return payload;
  };

  if (cacheIdentity) {
    // Concurrent RSC navigations share the same in-flight read as well as the
    // tiny post-response cache. The cache key is token-scoped, and invalidation
    // on mutations prevents old in-flight data from being cached afterward.
    const ttlMs = /\/api\/v1\/auth\/me(?:\?|$)/.test(pathText) ? 1_000 : 2_000;
    return getOrCreatePrivateReadCache(cacheIdentity, executeRequest, {
      ttlMs,
    });
  }

  return executeRequest();
}

export async function backendData(path, options) {
  const payload = await backendFetch(path, options);
  return Object.prototype.hasOwnProperty.call(payload || {}, "data")
    ? payload.data
    : payload;
}

export function getBackendTokenCookieName() {
  return FRONTEND_TOKEN_COOKIE;
}
