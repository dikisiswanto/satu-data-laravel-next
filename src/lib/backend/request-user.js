import { isTransientAuthFailure } from "@/lib/backend/auth-errors";
import { cache } from "react";

/** Verify the current portal identity against Laravel Sanctum on each server request. */
const verifyRequestUser = cache(async (backendClient) => {
  let result;
  try {
    result = await backendClient.auth.getUser();
  } catch (error) {
    if (!isTransientAuthFailure(error)) throw error;
    result = { error };
  }

  if (!result?.error || !isTransientAuthFailure(result.error)) return result;

  // A transient outage must never be interpreted as an expired session. Retry
  // once, then surface an unavailable state through the route error boundary.
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    const retry = await backendClient.auth.getUser();
    if (retry?.error && isTransientAuthFailure(retry.error)) {
      throw Object.assign(
        new Error(
          retry.error.message ||
            "Session verification is temporarily unavailable",
        ),
        {
          status: retry.error.status,
          code: retry.error.code,
        },
      );
    }
    return retry;
  } catch (retryError) {
    if (isTransientAuthFailure(retryError)) throw retryError;
    return { data: { user: null }, error: retryError };
  }
});

export function getRequestVerifiedUser(backendClient) {
  return verifyRequestUser(backendClient);
}
