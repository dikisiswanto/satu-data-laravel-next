/** Parse bounded positive integers from untrusted query parameters. */
export function parseBoundedPositiveInteger(value, fallback, maximum) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

/** Restrict search text before composing PostgREST filter expressions. */
export function normalizePublicSearch(value, maximumLength = 120) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}
