/**
 * Keep the relational preview projection bounded separately from the downloadable
 * resource. Very wide/verbose data remains downloadable even when duplicating it
 * into JSONB rows would create disproportionate storage and request overhead.
 */
export const MAX_PREVIEW_PROJECTION_BYTES = 32 * 1024 * 1024;
export const MAX_PREVIEW_REQUEST_BYTES = 768 * 1024;
export const MAX_PREVIEW_BATCH_ROWS = 1_000;
const ROW_ENVELOPE_BYTES = 96;

export function inspectPreviewProjection(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { available: false, reason: "empty", rowBytes: [], totalBytes: 0 };
  }

  const rowBytes = [];
  let totalBytes = 2;
  for (const record of records) {
    let serialized;
    try {
      serialized = JSON.stringify(record);
    } catch {
      return {
        available: false,
        reason: "row_not_serializable",
        rowBytes: [],
        totalBytes,
      };
    }
    if (typeof serialized !== "string") {
      return {
        available: false,
        reason: "row_not_serializable",
        rowBytes: [],
        totalBytes,
      };
    }
    const bytes = Buffer.byteLength(serialized, "utf8") + ROW_ENVELOPE_BYTES;
    if (bytes > MAX_PREVIEW_REQUEST_BYTES - 128) {
      return {
        available: false,
        reason: "row_too_large",
        rowBytes: [],
        totalBytes: totalBytes + bytes,
      };
    }
    totalBytes += bytes;
    if (totalBytes > MAX_PREVIEW_PROJECTION_BYTES) {
      return {
        available: false,
        reason: "projection_too_large",
        rowBytes: [],
        totalBytes,
      };
    }
    rowBytes.push(bytes);
  }

  return { available: true, reason: null, rowBytes, totalBytes };
}
