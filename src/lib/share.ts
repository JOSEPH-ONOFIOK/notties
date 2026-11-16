import "server-only";
import { query } from "./db";
import type { FragmentType, Rarity } from "./game/config";

export type ShareKind = "pull" | "nottie" | "wanted";

export async function sharePull(id: string) {
  if (!/^\d+$/.test(id)) return null;
  return (
    await query<{ type: FragmentType; rarity: Rarity; username: string; ref_code: string; event: string | null; created_at: string }>(
      "select c.type, c.rarity, u.x_username as username, u.ref_code, c.event, c.created_at from crate_claims c join users u on u.id = c.user_id where c.id = $1 and u.status = 'active'",
      [id],
    )
  ).rows[0] ?? null;
}

export async function shareUser(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const u = (
    await query<{ id: string; username: string; ref_code: string; avatar_url: string | null; lifetime_points: string; claims: number; faction: string | null; forged_at: string | null; seed: number | null }>(
      "select u.id, u.x_username as username, u.ref_code, u.avatar_url, u.lifetime_points::text, u.claims, u.faction, f.created_at as forged_at, f.nottie_seed as seed from users u left join forge_completions f on f.user_id = u.id where u.id = $1 and u.status = 'active'",
      [id],
    )
  ).rows[0];
  if (!u) return null;
  const rank = Number((await query<{ n: string }>("select count(*)::text as n from users where status = 'active' and lifetime_points > $1", [u.lifetime_points])).rows[0].n) + 1;
  return { ...u, points: Number(u.lifetime_points), rank };
}
