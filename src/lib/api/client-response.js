/**
 * Parse API responses without masking the caller's domain-specific error copy.
 * Non-JSON proxy/runtime errors safely become an empty object.
 * @param {Response} response
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readApiResponse(response) {
  try {
    const payload = await response.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  } catch {
    return {};
  }
}

/**
 * Read mutation responses strictly: an empty/malformed JSON body with a 2xx
 * status must not be treated as proof that a write succeeded.
 */
export async function readApiMutationResponse(response) {
  const payload = await readApiResponse(response);
  if (response.ok && Object.keys(payload).length === 0) {
    const error = new Error("invalid_api_response");
    error.code = "invalid_api_response";
    throw error;
  }
  return payload;
}
