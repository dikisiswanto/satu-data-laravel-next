import { isTransientAuthFailure } from "@/lib/backend/auth-errors";

/** Verify the current portal identity against Laravel Sanctum on each server request. */
export async function getRequestVerifiedUser(backendClient) {
  try {
    const result = await backendClient.auth.getUser();
    if (result?.error && isTransientAuthFailure(result.error)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return await backendClient.auth.getUser();
    }
    return result;
  } catch (error) {
    if (!isTransientAuthFailure(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    try { return await backendClient.auth.getUser(); }
    catch (retryError) { return { data: { user: null }, error: retryError }; }
  }
}
