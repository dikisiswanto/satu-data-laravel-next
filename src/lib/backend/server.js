import "server-only";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "wajo_portal_token";

export function backendBaseUrl() {
  return (process.env.BACKEND_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export async function backendFetch(path, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const cookieStore = auth ? await cookies() : null;
  const token = cookieStore?.get(TOKEN_COOKIE)?.value;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${backendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...fetchOptions,
    headers,
    cache: fetchOptions.cache || "no-store",
    redirect: "manual",
  });
  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    const raw = await response.text().catch(() => "");
    payload = raw ? { message: raw.slice(0, 500) } : null;
  }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Backend API returned ${response.status}`);
    error.status = response.status;
    error.code = payload?.error || payload?.code || `http_${response.status}`;
    error.errors = payload?.errors || null;
    throw error;
  }
  return payload;
}

export async function backendData(path, options) {
  const payload = await backendFetch(path, options);
  return Object.prototype.hasOwnProperty.call(payload || {}, "data") ? payload.data : payload;
}

export function getBackendTokenCookieName() {
  return TOKEN_COOKIE;
}
