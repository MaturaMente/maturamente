type CacheEntry = {
  url: string;
  expiresAtMs: number;
};

const globalForSignedUrlCache = globalThis as unknown as {
  __signedUrlCache?: Map<string, CacheEntry>;
};

const cache: Map<string, CacheEntry> =
  globalForSignedUrlCache.__signedUrlCache ??
  (globalForSignedUrlCache.__signedUrlCache = new Map());

/**
 * Returns cached URL and seconds remaining if present and not expired.
 */
export function getCachedSignedUrl(
  key: string
): { url: string; expiresInSeconds: number } | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now >= entry.expiresAtMs) {
    cache.delete(key);
    return null;
  }

  const expiresInSeconds = Math.max(
    0,
    Math.floor((entry.expiresAtMs - now) / 1000)
  );
  return { url: entry.url, expiresInSeconds };
}

/**
 * Stores URL with a TTL, with a small safety buffer subtracted to avoid edge expiry.
 */
export function setCachedSignedUrl(
  key: string,
  url: string,
  ttlSeconds: number
) {
  const safetyBufferMs = 3000; // 3 seconds buffer
  const expiresAtMs = Date.now() + ttlSeconds * 1000 - safetyBufferMs;
  cache.set(key, { url, expiresAtMs });
}

/**
 * Optional: expose a way to clear a specific key (not used but handy for future use).
 */
export function clearCachedSignedUrl(key: string) {
  cache.delete(key);
}


