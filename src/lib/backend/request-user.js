import { isTransientAuthFailure } from "@/lib/backend/auth-errors";
import { cache } from "react";
import { backendFetch } from "@/lib/backend/server";

/** Verify the current portal identity through Laravel Sanctum per server request. */
const verifyRequestUser = cache(async () => {
  let result;
  try {
    const payload = await backendFetch("/api/v1/auth/me");
    result = { data: { user: payload?.data || null }, error: null };
  } catch (error) {
    result = { data: { user: null }, error };
  }

  if (
    !result?.error ||
    Number(result.error.status) === 429 ||
    !isTransientAuthFailure(result.error)
  ) {
    return result;
  }

  // A transient outage must never be interpreted as an expired session. Retry
  // once, then surface an unavailable state through the route error boundary.
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    const payload = await backendFetch("/api/v1/auth/me");
    return { data: { user: payload?.data || null }, error: null };
  } catch (retryError) {
    if (isTransientAuthFailure(retryError)) throw retryError;
    return { data: { user: null }, error: retryError };
  }
});

export function getRequestVerifiedUser() {
  return verifyRequestUser();
}
