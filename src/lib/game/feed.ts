import "server-only";
import { cached } from "../cache";
import { maybeHousekeep } from "../housekeeping";
import { query, type Q } from "../db";

export type FeedItem = { id: number; username: string; avatar: string | null; kind: "pull" | "forge" | "swap" | "streak" | "faction" | "book"; data: Record<string, unknown>; created_at: string };

export async function pushFeed(q: Q, userId: string, kind: FeedItem["kind"], data: Record<string, unknown>) {
  await q.query("insert into feed (user_id, kind, data) values ($1,$2,$3)", [userId, kind, JSON.stringify(data)]);
}

const FEED_SIZE = 20;

/**
 * Latest public events (only active accounts). `after` returns only newer items for polling.
 * Everyone sees the same list, so it's cached for 10s: a hundred open tabs cost one query.
 */
export async function readFeed(after = 0, limit = FEED_SIZE): Promise<FeedItem[]> {
  const latest = await cached("feed", 10_000, async () => {
    maybeHousekeep();
    const { rows } = await query<FeedItem>(
      `select f.id, u.x_username as username, u.avatar_url as avatar, f.kind, f.data, f.created_at
         from feed f join users u on u.id = f.user_id
        where u.status = 'active'
        order by f.id desc limit $1`,
      [FEED_SIZE],
    );
    return rows.map((r) => ({ ...r, id: Number(r.id) }));
  });
  return latest.filter((i) => i.id > after).slice(0, limit);
}
