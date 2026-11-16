import "server-only";

/**
 * A tiny in-memory cache for public, read-only data (settings, the live feed, homepage numbers).
 * Each server instance keeps its own copy for `ttlMs`, and requests that arrive at the same time
 * share one database query. This keeps the database asleep while people are only browsing, which
 * is what makes a free Neon plan last: it bills by the hours it is awake.
 *
 * Writes call `bust(key)` so the instance that made the change sees it straight away; other
 * instances catch up within the TTL. Never cache per-player data here.
 */
type Entry = { at: number; ttl: number; value: Promise<unknown> };

const g = globalThis as unknown as { __nottiesCache?: Map<string, Entry> };
const store = (g.__nottiesCache ??= new Map());

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { at: Date.now(), ttl: ttlMs, value });
  // Don't keep a failed load around: the next request tries again.
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}

/** Drop cached entries whose key starts with `prefix`. */
export function bust(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
