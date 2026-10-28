import { createHash } from "node:crypto";

const DEFAULT_TTL_MS = 2_000;
const MAX_ENTRIES = 500;
const entries = new Map();
const inFlightReads = new Map();

function tokenFingerprint(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function pruneExpired(now = Date.now()) {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

/**
 * Build a cache identity for an authenticated portal read. Raw session tokens
 * are never stored in cache keys or entries. `path` includes the query string.
 */
export function createPrivateReadCacheIdentity({ token, path, headers = [] }) {
  if (typeof token !== "string" || token.length < 20 || token.length > 512) {
    return null;
  }
  const tokenHash = tokenFingerprint(token);
  const headerPairs =
    headers instanceof Headers ? [...headers.entries()] : headers;
  const normalizedHeaders = (Array.isArray(headerPairs) ? headerPairs : [])
    .filter(([name]) => String(name).toLowerCase() !== "authorization")
    .map(([name, value]) => [String(name).toLowerCase(), String(value)])
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    tokenHash,
    key: `${tokenHash}:${String(path)}:${JSON.stringify(normalizedHeaders)}`,
  };
}

export function getPrivateReadCache(identity, now = Date.now()) {
  if (!identity?.key) return undefined;
  pruneExpired(now);
  const entry = entries.get(identity.key);
  if (!entry || entry.expiresAt <= now) {
    entries.delete(identity.key);
    return undefined;
  }
  // Move a hit to the end to approximate LRU eviction order.
  entries.delete(identity.key);
  entries.set(identity.key, entry);
  return cloneJson(entry.payload);
}

/**
 * Coalesce concurrent reads for the same user and endpoint. This closes the
 * cache-miss race when several React Server Component renders start together.
 * Failed/null responses are never cached, and an intervening mutation marks
 * the in-flight read stale so it cannot repopulate the cache after invalidation.
 */
export async function getOrCreatePrivateReadCache(
  identity,
  loader,
  { ttlMs = DEFAULT_TTL_MS } = {},
) {
  if (!identity?.key || typeof loader !== "function") return loader();

  const cached = getPrivateReadCache(identity);
  if (cached !== undefined) return cached;

  const existing = inFlightReads.get(identity.key);
  if (existing) return cloneJson(await existing.promise);

  const entry = {
    tokenHash: identity.tokenHash,
    invalidated: false,
    promise: null,
  };
  entry.promise = (async () => {
    // Recheck after registering the in-flight operation to avoid an avoidable
    // duplicate if a synchronous cache fill happened between callers.
    const cachedAgain = getPrivateReadCache(identity);
    if (cachedAgain !== undefined) return cachedAgain;

    const payload = await loader();
    if (!entry.invalidated && payload !== null && payload !== undefined) {
      setPrivateReadCache(identity, payload, { ttlMs });
    }
    return payload;
  })();
  inFlightReads.set(identity.key, entry);

  try {
    return cloneJson(await entry.promise);
  } finally {
    if (inFlightReads.get(identity.key) === entry) {
      inFlightReads.delete(identity.key);
    }
  }
}

export function setPrivateReadCache(
  identity,
  payload,
  { ttlMs = DEFAULT_TTL_MS, now = Date.now() } = {},
) {
  if (!identity?.key || payload === undefined || ttlMs <= 0) return;
  pruneExpired(now);
  entries.delete(identity.key);
  entries.set(identity.key, {
    tokenHash: identity.tokenHash,
    payload: cloneJson(payload),
    expiresAt: now + ttlMs,
  });
  while (entries.size > MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (oldestKey === undefined) break;
    entries.delete(oldestKey);
  }
}

/** Invalidate every cached read associated with this user's session token. */
export function invalidatePrivateReadCache(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 512) {
    return;
  }
  const fingerprint = tokenFingerprint(token);
  for (const [key, entry] of entries) {
    if (entry.tokenHash === fingerprint) entries.delete(key);
  }
  for (const [key, entry] of inFlightReads) {
    if (entry.tokenHash === fingerprint) {
      entry.invalidated = true;
      inFlightReads.delete(key);
    }
  }
}

/** Test-only hook; never expose cache contents to application responses. */
export function clearPrivateReadCacheForTests() {
  entries.clear();
  inFlightReads.clear();
}
