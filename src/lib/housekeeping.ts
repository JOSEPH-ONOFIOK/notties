import "server-only";
import { query } from "./db";

/**
 * Keeps the database small enough for a free plan (Neon free storage is ~0.5 GB). Runs at most
 * once every 6 hours per server instance, piggybacking on a read that already happens (the live
 * feed refresh), so it never wakes the database on its own. Game records players own (cards,
 * $NOTTIES history, crate pulls, trades) are never deleted, only throwaway rows.
 */
let last = 0;
export function maybeHousekeep() {
  if (Date.now() - last < 6 * 3600_000) return;
  last = Date.now();
  void (async () => {
    const jobs = [
      // Live feed: only the newest 500 entries are ever shown.
      "delete from feed where id < (select id from feed order by id desc offset 500 limit 1)",
      // Chat: a week of messages; announcements: two months; anything a moderator removed.
      "delete from chat_messages where deleted or (channel = 'chat' and created_at < now() - interval '7 days') or (channel = 'announce' and created_at < now() - interval '60 days')",
      // Mail that's been read and claimed for a month.
      "delete from mail where read_at is not null and claimed_at is not null and created_at < now() - interval '30 days'",
      // Old bookkeeping.
      "delete from risk_events where resolved and created_at < now() - interval '30 days'",
      "delete from task_clicks where clicked_at < now() - interval '14 days'",
      "delete from wallet_nonces where created_at < now() - interval '1 day'",
      // Rate limits live in memory now; this table is no longer used.
      "delete from rate_limits",
    ];
    for (const sql of jobs) await query(sql).catch(() => {});
    // Recruits who already qualify but whose recruiter was never paid.
    await (await import("./game/referrals")).settlePendingReferrals().catch(() => {});
  })();
}
