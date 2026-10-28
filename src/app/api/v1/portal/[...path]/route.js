import "server-only";
import { cookies } from "next/headers";
import { backendBaseUrl } from "@/lib/backend/server";
import { invalidatePrivateReadCache } from "@/lib/backend/private-read-cache";
import { getFrontendToken } from "@/lib/auth/session-cookie";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_HEADERS = [
  "accept",
  "content-type",
  "origin",
  "referer",
  "sec-fetch-site",
  "x-request-id",
  "x-upload-token",
  "range",
  "if-range",
  "if-match",
  "if-none-match",
  "if-modified-since",
  "if-unmodified-since",
];
const RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "retry-after",
  "x-request-id",
  "content-disposition",
  "etag",
  "last-modified",
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy browser portal API requests through Next so the HttpOnly session token
 * is converted to an explicit Bearer header before the request reaches Laravel.
 * This keeps browser CRUD auth consistent with server-rendered page requests.
 * Request bodies are streamed, so the signed binary-upload endpoint remains safe
 * even when reached locally without the deployment edge's direct-upload rule.
 */
async function proxyPortalApi(request) {
  const method = request.method.toUpperCase();
  const incomingUrl = new URL(request.url);
  const headers = new Headers();
  const suppliedRequestId = request.headers.get("x-request-id") || "";
  const requestId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      suppliedRequestId,
    )
      ? suppliedRequestId.toLowerCase()
      : globalThis.crypto.randomUUID();
  headers.set("X-Request-Id", requestId);

  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("X-Request-Id", requestId);
  if (!headers.has("accept")) headers.set("Accept", "application/json");

  const cookieStore = await cookies();
  const token = getFrontendToken(cookieStore);
  if (typeof token === "string" && token.length >= 20 && token.length <= 512) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchSite = (headers.get("sec-fetch-site") || "").toLowerCase();
  if (token && fetchSite === "cross-site") {
    return Response.json(
      {
        error: "origin_not_allowed",
        message: "The request origin could not be verified.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  // Cookie-authenticated writes must carry an Origin or Referer. Laravel checks
  // its configured frontend allowlist; this guard prevents a missing-header
  // request from losing the cookie-based CSRF signal at a reverse-proxy hop.
  if (
    MUTATION_METHODS.has(method) &&
    token &&
    !headers.has("origin") &&
    !headers.has("referer")
  ) {
    return Response.json(
      {
        error: "origin_not_allowed",
        message: "The request origin could not be verified.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  // A browser mutation may make a cached server-rendered list or detail stale.
  // Clear this token-scoped cache before forwarding, including ambiguous writes.
  if (MUTATION_METHODS.has(method)) invalidatePrivateReadCache(token);

  const upstreamUrl = `${backendBaseUrl()}${incomingUrl.pathname}${incomingUrl.search}`;
  const init = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: request.signal,
  };
  if (method !== "GET" && method !== "HEAD" && request.body) {
    const contentType = (
      request.headers.get("content-type") || ""
    ).toLowerCase();
    if (contentType.includes("application/json")) {
      // Buffer ordinary JSON mutations before forwarding. This avoids a flaky
      // streamed-body handoff for small CRUD forms while keeping binary/multipart
      // uploads streamed so large files are not duplicated in memory.
      const declaredLength = Number(request.headers.get("content-length") || 0);
      const maxJsonBodyBytes = 5 * 1024 * 1024;
      if (declaredLength > maxJsonBodyBytes) {
        return Response.json(
          {
            error: "request_too_large",
            message: "JSON request body exceeds the portal limit.",
          },
          {
            status: 413,
            headers: {
              "Cache-Control": "no-store",
              "X-Request-Id": requestId,
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
      const body = new Uint8Array(await request.arrayBuffer());
      if (body.byteLength > maxJsonBodyBytes) {
        return Response.json(
          {
            error: "request_too_large",
            message: "JSON request body exceeds the portal limit.",
          },
          {
            status: 413,
            headers: {
              "Cache-Control": "no-store",
              "X-Request-Id": requestId,
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
      init.body = body;
    } else {
      init.body = request.body;
      init.duplex = "half";
    }
  }

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch (error) {
    // Next/browser navigation can cancel in-flight RSC/API work. That is not an
    // upstream outage and must not be reported as a misleading HTTP 503.
    if (request.signal.aborted || error?.name === "AbortError") {
      return new Response(null, {
        status: 499,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
        },
      });
    }

    console.error("portal_api_upstream_unavailable", {
      request_id: requestId,
      method,
      path: incomingUrl.pathname,
      error_name: typeof error?.name === "string" ? error.name : "Error",
    });
    return Response.json(
      {
        error: "service_unavailable",
        message: "The portal API is temporarily unavailable.",
        request_id: requestId,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "2",
          "X-Request-Id": requestId,
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("Cache-Control", "private, no-store");
  }
  if (!responseHeaders.has("x-request-id")) {
    responseHeaders.set("X-Request-Id", requestId);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyPortalApi;
export const HEAD = proxyPortalApi;
export const POST = proxyPortalApi;
export const PUT = proxyPortalApi;
export const PATCH = proxyPortalApi;
export const DELETE = proxyPortalApi;
export const OPTIONS = proxyPortalApi;
