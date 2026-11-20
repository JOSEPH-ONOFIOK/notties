import "server-only";

/**
 * Fixed-window rate limiter kept in server memory. It used to be a Postgres upsert on every
 * request, which cost a database write per tap; in memory it's free. Each server instance
 * counts on its own, which is fine here: every game action is also guarded by database
 * transactions, idempotency keys and per-player checks.
 */
type Win = { n: number; reset: number };
const g = globalThis as unknown as { __nottiesRate?: Map<string, Win> };
const wins = (g.__nottiesRate ??= new Map());
let lastPurge = 0;

export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const w = wins.get(key);
  if (!w || w.reset < now) wins.set(key, { n: 1, reset: now + windowMs });
  else w.n++;
  if (now - lastPurge > 60_000) {
    lastPurge = now;
    for (const [k, v] of wins) if (v.reset < now) wins.delete(k);
  }
  return (wins.get(key)?.n ?? 1) <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
