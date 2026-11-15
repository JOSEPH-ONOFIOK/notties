import "server-only";
import { query, type Q } from "../db";

export type FeedItem = { id: number; username: string; avatar: string | null; kind: "pull" | "forge" | "swap" | "streak" | "faction"; data: Record<string, unknown>; created_at: string };

export async function pushFeed(q: Q, userId: string, kind: FeedItem["kind"], data: Record<string, unknown>) {
  await q.query("insert into feed (user_id, kind, data) values ($1,$2,$3)", [userId, kind, JSON.stringify(data)]);
}

/** Latest public events (only active accounts). `after` returns only newer items for polling. */
export async function readFeed(after = 0, limit = 20): Promise<FeedItem[]> {
  const { rows } = await query<FeedItem>(
    `select f.id, u.x_username as username, u.avatar_url as avatar, f.kind, f.data, f.created_at
       from feed f join users u on u.id = f.user_id
      where f.id > $1 and u.status = 'active'
      order by f.id desc limit $2`,
    [after, limit],
  );
  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}
