import "server-only";
import { GameError, query, withTx } from "../db";
import { FACTIONS, type FactionId } from "./config";
import { pushFeed } from "./feed";

/* ───────────── factions ───────────── */

export async function joinFaction(userId: string, faction: string) {
  if (!FACTIONS.some((f) => f.id === faction)) throw new GameError("Unknown gang");
  return withTx(async (q) => {
    const u = (await q.query<{ faction: string | null }>("select faction from users where id = $1 for update", [userId])).rows[0];
    if (u?.faction) throw new GameError("You already picked a gang. Loyalty is forever.");
    await q.query("update users set faction = $2 where id = $1", [userId, faction]);
    await pushFeed(q, userId, "faction", { faction });
    return { faction: faction as FactionId };
  });
}

export async function factionBoard() {
  const { rows } = await query<{ faction: FactionId; members: number; trouble: string; forged: number; crates: number }>(
    `select u.faction, count(*)::int as members, coalesce(sum(u.lifetime_points),0)::text as trouble,
            count(f.id)::int as forged, coalesce(sum(u.claims),0)::int as crates
       from users u left join forge_completions f on f.user_id = u.id
      where u.faction is not null and u.status = 'active'
      group by u.faction`,
  );
  return FACTIONS.map((f) => {
    const r = rows.find((x) => x.faction === f.id);
    return { ...f, members: r?.members ?? 0, trouble: Number(r?.trouble ?? 0), forged: r?.forged ?? 0, crates: r?.crates ?? 0 };
  }).sort((a, b) => b.trouble - a.trouble);
}
