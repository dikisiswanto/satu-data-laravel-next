/** Fail closed when a required Laravel API read fails instead of treating it as an empty result. */
export function assertBackendQuery(error, operation) {
  if (!error) return;
  console.error("backend_read_failed", {
    operation,
    code: error.code || "unknown",
    status: error.status || null,
  });
  throw new Error(`backend_read_failed:${operation}`);
}

export function classifyBackendError(error) {
  const status = error?.status;
  const code = error?.code;
  if (status === 403 || code === "forbidden" || code === "42501")
    return "forbidden";
  if (status === 404 || code === "not_found" || code === "P0002")
    return "not_found";
  if (
    status === 422 ||
    code === "validation_failed" ||
    ["22023", "23514", "22P02"].includes(code)
  )
    return "validation_failed";
  if (status === 409 || code === "conflict" || code === "23505")
    return "conflict";
  return "service_unavailable";
}
