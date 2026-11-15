import "server-only";
import { query } from "./db";

/**
 * Fixed-window rate limiter stored in Postgres, so it's shared by every server instance (on
 * Vercel each request can land on a different one). One upsert per check.
 */
let lastPurge = 0;
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const { rows } = await query<{ n: number }>(
    `insert into rate_limits (key, n, reset_at) values ($1, 1, now() + make_interval(secs => $2::double precision))
     on conflict (key) do update set
       n = case when rate_limits.reset_at < now() then 1 else rate_limits.n + 1 end,
       reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
     returning n`,
    [key, windowMs / 1000],
  );
  if (Date.now() - lastPurge > 10 * 60_000) {
    lastPurge = Date.now();
    void query("delete from rate_limits where reset_at < now() - interval '1 hour'").catch(() => {});
  }
  return Number(rows[0]?.n ?? 1) <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
