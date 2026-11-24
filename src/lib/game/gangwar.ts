import "server-only";
import { GameError, query, withTx } from "../db";
import { bust, cached } from "../cache";
import { FACTIONS, PARTS } from "./config";
import { addFragment, addPoints } from "./core";
import { broadcastMail, sendMail } from "./mail";

/**
 * Gang Wars. For a set time (default 3 days) each gang scores the $NOTTIES its members earn
 * PLUS every Lab Escape point they score. When it ends, the prize pool (default 500,000 $NOTTIES)
 * is split evenly between the winning gang's members who played during the war, and each also
 * gets one of every part, so they can assemble straight away. Settles itself on
 * the first page view after the end time (or when an admin ends it).
 */
export type War = { id: string; starts_at: string; ends_at: string; airdrop: number; status: "live" | "done"; winner: string | null; rewarded: number };
export type Standing = { id: string; name: string; color: string; img: string; points: number; members: number };

// Transfers and market moves just shift $NOTTIES between players; only earning counts.
const EARNED = "p.delta > 0 and p.reason not in ('send_in','market_sale','bid_refund','admin','gangwar') and p.reason not like 'mail:send%'";

export async function latestWar(): Promise<War | null> {
  return cached("war", 15_000, async () => {
    const r = (await query<War>("select id::text, starts_at, ends_at, airdrop, status, winner, rewarded from gang_wars order by id desc limit 1")).rows[0];
    return r ? { ...r, starts_at: new Date(r.starts_at).toISOString(), ends_at: new Date(r.ends_at).toISOString() } : null;
  });
}

/** Per-player war points: $NOTTIES earned + Lab Escape scores, inside the war window. */
const PLAYER_POINTS = `
  select user_id, sum(pts) as pts from (
    select p.user_id, p.delta as pts from point_transactions p where p.created_at >= $1 and p.created_at < $2 and ${EARNED}
    union all
    select r.user_id, r.score as pts from runner_runs r where r.ended_at >= $1 and r.ended_at < $2 and r.score > 0
  ) x group by user_id`;

export async function standings(war: War): Promise<Standing[]> {
  return cached(`war:board:${war.id}`, 30_000, async () => {
    const { rows } = await query<{ faction: string; points: string; members: number }>(
      `select u.faction, coalesce(sum(pp.pts), 0)::text as points, count(*)::int as members
         from (${PLAYER_POINTS}) pp join users u on u.id = pp.user_id
        where u.faction is not null and u.status = 'active'
        group by u.faction`,
      [war.starts_at, war.ends_at],
    );
    return FACTIONS.map((f) => {
      const r = rows.find((x) => x.faction === f.id);
      return { id: f.id, name: f.name, color: f.color, img: f.img, points: Number(r?.points ?? 0), members: r?.members ?? 0 };
    }).sort((a, b) => b.points - a.points);
  });
}

/** One player's points in this war. */
export async function myWarPoints(war: War, userId: string) {
  const { rows } = await query<{ n: string }>(`select coalesce(sum(pts),0)::text as n from (${PLAYER_POINTS}) pp where pp.user_id = $3`, [war.starts_at, war.ends_at, userId]);
  return Number(rows[0]?.n ?? 0);
}

export async function startWar(admin: string, days: number, airdrop: number) {
  const d = Math.max(0.04, Math.min(14, Number(days) || 3));
  const drop = Math.max(0, Math.min(100_000_000, Math.round(Number(airdrop) || 0)));
  const live = (await query("select 1 from gang_wars where status = 'live'")).rows.length;
  if (live) throw new GameError("A Gang War is already running. End it first.");
  const r = (await query<{ id: string; ends_at: string }>("insert into gang_wars (starts_at, ends_at, airdrop, created_by) values (now(), now() + make_interval(secs => $1::double precision), $2, $3) returning id, ends_at", [d * 86400, drop, admin])).rows[0];
  const parts = PARTS.length;
  await query("insert into chat_messages (channel, user_id, author, body) values ('announce', null, 'The Notties', $1)", [
    `⚔️ GANG WARS HAVE STARTED!\nFor the next ${d === 3 ? "3 days" : `${d} days`}, every $NOTTIES you earn and every Lab Escape point you score counts for your gang.\nThe winning gang splits ${drop.toLocaleString()} $NOTTIES evenly AND everyone gets all ${parts} parts to assemble a Nottie.\nPick your gang, play Lab Escape and recruit your friends!`,
  ]);
  await broadcastMail(null, `war:${r.id}`, "⚔️ Gang Wars have started", `Every $NOTTIES you earn and every Lab Escape point counts for your gang. The winning gang splits ${drop.toLocaleString()} $NOTTIES + gets all ${parts} parts to assemble. Pick a side, play and recruit!`);
  bust("war");
  bust("chat:");
  return { id: String(r.id) };
}

/** Settle a finished war (idempotent): pick the winner, airdrop, give parts, announce. */
export async function settleWar(force = false) {
  const war = (await query<War>("select id::text, starts_at, ends_at, airdrop, status, winner, rewarded from gang_wars where status = 'live' order by id desc limit 1")).rows[0];
  if (!war) return null;
  if (!force && new Date(war.ends_at).getTime() > Date.now()) return null;
  const result = await withTx(async (q) => {
    const w = (await q.query<{ status: string }>("select status from gang_wars where id = $1 for update", [war.id])).rows[0];
    if (w?.status !== "live") return null;
    const end = force ? new Date().toISOString() : new Date(war.ends_at).toISOString();
    const board = (await q.query<{ faction: string; points: string }>(
      `select u.faction, coalesce(sum(pp.pts),0)::text as points from (${PLAYER_POINTS}) pp join users u on u.id = pp.user_id
        where u.faction is not null and u.status = 'active'
        group by u.faction order by sum(pp.pts) desc`,
      [war.starts_at, end],
    )).rows;
    const winner = board[0]?.faction ?? null;
    let rewarded = 0;
    let share = 0;
    if (winner) {
      // Members of the winning gang who earned something during the war.
      const members = (await q.query<{ id: string }>(
        `select pp.user_id as id from (${PLAYER_POINTS}) pp join users u on u.id = pp.user_id
          where u.faction = $3 and u.status = 'active' and pp.pts > 0`,
        [war.starts_at, end, winner],
      )).rows;
      const gang = FACTIONS.find((f) => f.id === winner)!;
      // The pool is split evenly between everyone in the winning gang who played.
      share = members.length ? Math.floor(war.airdrop / members.length) : 0;
      for (const m of members) {
        if (share > 0) await addPoints(q, m.id, share, "gangwar", war.id, `war:${war.id}:${m.id}:pts`);
        for (const part of PARTS) await addFragment(q, m.id, part.type, 1, "gangwar", war.id, `war:${war.id}:${m.id}:${part.type}`);
        await sendMail(q, m.id, { kind: "system", title: `🏆 ${gang.name} won Gang Wars!`, body: `Your share of the ${war.airdrop.toLocaleString()} $NOTTIES pool is ${share.toLocaleString()} $NOTTIES, plus one of every part. Head to the Forge to assemble your Nottie!`, idem: `warwin:${war.id}:${m.id}` });
        rewarded++;
      }
    }
    await q.query("update gang_wars set status = 'done', winner = $2, rewarded = $3, ends_at = $4 where id = $1", [war.id, winner, rewarded, end]);
    const name = winner ? FACTIONS.find((f) => f.id === winner)!.name : null;
    const lines = board.map((b, i) => `${i + 1}. ${FACTIONS.find((f) => f.id === b.faction)?.name ?? b.faction}: ${Number(b.points).toLocaleString()}`).join("\n");
    await q.query("insert into chat_messages (channel, user_id, author, body) values ('announce', null, 'The Notties', $1)", [
      name ? `🏆 GANG WARS ARE OVER! ${name} wins!\n${lines}\n${war.airdrop.toLocaleString()} $NOTTIES split between ${rewarded} member${rewarded === 1 ? "" : "s"} of ${name} (${share.toLocaleString()} each) + all ${PARTS.length} parts to assemble. Next war soon!` : "Gang Wars ended with no points scored. Next war soon!",
    ]);
    return { winner: name, rewarded };
  });
  if (result) {
    await broadcastMail(null, `warend:${war.id}`, result.winner ? `🏆 ${result.winner} won Gang Wars` : "Gang Wars ended", result.winner ? `${result.winner} took the win. ${result.rewarded} members split the pool and got a full set of parts. Pick your side for the next war!` : "No winner this time. Next war soon!");
  }
  bust("war");
  bust("chat:");
  return result;
}
