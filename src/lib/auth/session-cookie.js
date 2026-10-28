/** Shared frontend session-cookie name and migration fallback. */
const configuredCookieName = (
  process.env.FRONTEND_TOKEN_COOKIE || "portal_session_token"
).trim();
export const FRONTEND_TOKEN_COOKIE = /^[A-Za-z0-9_-]{1,80}$/.test(
  configuredCookieName,
)
  ? configuredCookieName
  : "portal_session_token";
export const LEGACY_FRONTEND_TOKEN_COOKIE = "wajo_portal_token";
export const FRONTEND_TOKEN_COOKIE_NAMES = Object.freeze([
  ...new Set([FRONTEND_TOKEN_COOKIE, LEGACY_FRONTEND_TOKEN_COOKIE]),
]);

export function isValidFrontendToken(value) {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    value.length <= 512 &&
    !/[\r\n\x00-\x20]/.test(value)
  );
}

export function getFrontendToken(cookieStore) {
  for (const name of FRONTEND_TOKEN_COOKIE_NAMES) {
    const value = cookieStore?.get?.(name)?.value;
    if (isValidFrontendToken(value)) return value;
  }
  return null;
}

export function hasFrontendToken(cookieStore) {
  return Boolean(getFrontendToken(cookieStore));
}

export function setFrontendToken(cookieStore, value, options) {
  if (!isValidFrontendToken(value))
    throw new TypeError("Frontend session token is invalid");
  cookieStore.set(FRONTEND_TOKEN_COOKIE, value, options);
  if (FRONTEND_TOKEN_COOKIE !== LEGACY_FRONTEND_TOKEN_COOKIE) {
    cookieStore.delete(LEGACY_FRONTEND_TOKEN_COOKIE);
  }
}

export function deleteFrontendTokenCookies(cookieStore) {
  for (const name of FRONTEND_TOKEN_COOKIE_NAMES) cookieStore.delete(name);
}
