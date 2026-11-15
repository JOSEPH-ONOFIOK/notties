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

/* ───────────── badges (derived from activity, nothing extra stored) ───────────── */

export type Badge = { id: string; name: string; how: string; earned: boolean; icon: string };

export async function badgesFor(userId: string): Promise<Badge[]> {
  const { rows } = await query<Record<string, number>>(
    `select
       (select claims from users where id = $1) as crates,
       (select best_streak from users where id = $1) as best_streak,
       (select count(*)::int from crate_claims where user_id = $1 and rarity = 'legendary') as legendary,
       (select count(*)::int from crate_claims where user_id = $1 and rarity = 'epic') as epic,
       (select count(*)::int from crate_claims where user_id = $1 and source = 'shop') as shop,
       (select count(*)::int from forge_completions where user_id = $1) as forged,
       (select count(*)::int from trades where sender_id = $1) as gifts,
       (select count(*)::int from trade_offers where status = 'filled' and (maker_id = $1 or taker_id = $1)) as swaps,
       (select count(*)::int from referrals where referrer_id = $1 and status = 'verified') as recruits,
       (select count(*)::int from task_completions where user_id = $1) as missions,
       (select count(*)::int from pawn_sales where user_id = $1) as pawned`,
    [userId],
  );
  const c = rows[0] ?? {};
  const n = (k: string) => Number(c[k] ?? 0);
  return [
    { id: "first", name: "Crate Cracker", how: "Crack your first crate", earned: n("crates") >= 1, icon: "box" },
    { id: "goblin", name: "Crate Goblin", how: "Crack 50 crates", earned: n("crates") >= 50, icon: "boxes" },
    { id: "epic", name: "Teacher's Pet", how: "Pull an Epic", earned: n("epic") >= 1, icon: "book" },
    { id: "legend", name: "Shard Hunter", how: "Pull a Legendary", earned: n("legendary") >= 1, icon: "diamond" },
    { id: "one", name: "One of Us", how: "Assemble your Nottie", earned: n("forged") >= 1, icon: "flask" },
    { id: "regular", name: "Regular", how: "7-day roll call streak", earned: n("best_streak") >= 7, icon: "flame" },
    { id: "lives", name: "Lives Here", how: "30-day roll call streak", earned: n("best_streak") >= 30, icon: "home" },
    { id: "fence", name: "The Fence", how: "Gift 10 cards", earned: n("gifts") >= 10, icon: "gift" },
    { id: "dealer", name: "Dealer", how: "Complete 5 swaps", earned: n("swaps") >= 5, icon: "swap" },
    { id: "gang", name: "Gang Leader", how: "5 recruits who play", earned: n("recruits") >= 5, icon: "users" },
    { id: "busy", name: "Busybody", how: "Finish 10 missions", earned: n("missions") >= 10, icon: "clipboard" },
    { id: "big", name: "Big Spender", how: "Buy a bonus crate", earned: n("shop") >= 1, icon: "coin" },
  ];
}
