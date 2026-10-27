const NON_TRANSIENT_AUTH_CODES = new Set([
  "invalid_credentials",
  "user_not_found",
  "email_not_confirmed",
  "session_not_found",
  "auth_session_missing",
  "weak_password",
  "same_password",
  "validation_failed",
]);

/** A missing browser session is a normal anonymous state, not an outage. */
export function isMissingAuthSession(error) {
  const code = String(error?.code || "").toLowerCase();
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    ["session_not_found", "auth_session_missing"].includes(code) ||
    name === "authsessionmissingerror" ||
    /auth session missing|session not found|no auth session/.test(message)
  );
}

/** Decide whether a backend authentication error looks like a transient service/transport failure. */
export function isTransientAuthFailure(error) {
  if (!error || isMissingAuthSession(error)) return false;
  const code = String(error.code || "").toLowerCase();
  if (NON_TRANSIENT_AUTH_CODES.has(code)) return false;
  const status = Number.isFinite(error.status) ? error.status : null;
  return (
    status === null ||
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}
/**
 * Ignore a missing-session error for an ordinary anonymous visit. If a browser
 * did send an auth cookie, keep the error visible because that session may be
 * expired or invalid and the user needs a clear explanation.
 */
export function shouldIgnoreMissingSessionError(error, hasSessionCookie) {
  return isMissingAuthSession(error) && hasSessionCookie !== true;
}
