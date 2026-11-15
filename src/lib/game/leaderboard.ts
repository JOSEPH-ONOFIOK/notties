import "server-only";
import { query } from "../db";

export type Board = "points" | "forges" | "claims" | "referrals" | "tasks";

export interface BoardRow {
  rank: number;
  id: string;
  username: string;
  avatar: string | null;
  value: number;
  forged: boolean;
}

/** Only active (not under review) accounts rank. Suspended players drop off until cleared. */
export async function leaderboard(board: Board, limit = 50): Promise<BoardRow[]> {
  const base = `from users u left join forge_completions f on f.user_id = u.id where u.status = 'active'`;
  const sql: Record<Board, string> = {
    points: `select u.id, u.x_username as username, u.avatar_url as avatar, u.lifetime_points::int as value, (f.id is not null) as forged ${base} order by u.lifetime_points desc, u.id asc limit $1`,
    forges: `select u.id, u.x_username as username, u.avatar_url as avatar, extract(epoch from f.created_at)::int as value, true as forged ${base} and f.id is not null order by f.created_at asc limit $1`,
    claims: `select u.id, u.x_username as username, u.avatar_url as avatar, u.claims as value, (f.id is not null) as forged ${base} order by u.claims desc, u.id asc limit $1`,
    referrals: `select u.id, u.x_username as username, u.avatar_url as avatar, count(r.id)::int as value, (f.id is not null) as forged ${base} join referrals r on r.referrer_id = u.id and r.status = 'verified' group by u.id, f.id order by value desc, u.id asc limit $1`,
    tasks: `select u.id, u.x_username as username, u.avatar_url as avatar, count(t.id)::int as value, (f.id is not null) as forged ${base} join task_completions t on t.user_id = u.id group by u.id, f.id order by value desc, u.id asc limit $1`,
  };
  const { rows } = await query<Omit<BoardRow, "rank">>(sql[board], [limit]);
  return rows.map((r, i) => ({ ...r, rank: i + 1, value: Number(r.value) }));
}

export async function stats() {
  const [players, forged, claims, trades] = await Promise.all([
    query<{ n: string }>("select count(*)::text as n from users"),
    query<{ n: string }>("select count(*)::text as n from forge_completions"),
    query<{ n: string }>("select count(*)::text as n from crate_claims"),
    query<{ n: string }>("select count(*)::text as n from trades"),
  ]);
  return { players: Number(players.rows[0].n), forged: Number(forged.rows[0].n), claims: Number(claims.rows[0].n), trades: Number(trades.rows[0].n) };
}
