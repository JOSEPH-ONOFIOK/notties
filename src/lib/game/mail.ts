import "server-only";
import { GameError, query, withTx, type Q } from "../db";
import { BOOSTABLE, addPoints, requireActive } from "./core";

/**
 * The mailbox. Mission rewards, recruit bonuses and the welcome gift arrive here as letters with
 * $NOTTIES and/or free crates attached; the player claims them. Cards sent by other players and
 * finished swaps also leave a letter (those cards are already in the stash).
 */
export type MailKind = "reward" | "referral" | "welcome" | "gift" | "swap" | "review" | "system";

export type Mail = { id: string; kind: MailKind; title: string; body: string | null; points: number; crates: number; part: string | null; read: boolean; claimed: boolean; created_at: string };

export async function sendMail(q: Q, userId: string, m: { kind: MailKind; title: string; body?: string | null; points?: number; crates?: number; reason?: string; part?: string | null; idem?: string }) {
  const points = Math.max(0, Math.round(Number(m.points) || 0));
  const crates = Math.max(0, Math.round(Number(m.crates) || 0));
  await q.query(
    `insert into mail (user_id, kind, title, body, points, crates, reason, part, idem_key, claimed_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9, case when $5::int = 0 and $6::int = 0 then now() end)
     on conflict (idem_key) do nothing`,
    [userId, m.kind, m.title.slice(0, 140), m.body?.slice(0, 500) ?? null, points, crates, m.reason ?? m.kind, m.part ?? null, m.idem ?? null],
  );
}

export async function listMail(userId: string, limit = 50): Promise<Mail[]> {
  const { rows } = await query<{ id: string; kind: MailKind; title: string; body: string | null; points: number; crates: number; part: string | null; read_at: string | null; claimed_at: string | null; created_at: string }>(
    "select id, kind, title, body, points, crates, part, read_at, claimed_at, created_at from mail where user_id = $1 order by id desc limit $2",
    [userId, limit],
  );
  return rows.map(({ read_at, claimed_at, ...r }) => ({ ...r, id: String(r.id), points: Number(r.points), crates: Number(r.crates), read: !!read_at, claimed: !!claimed_at }));
}

/** Letters that need a look: unread, or with a reward still waiting to be claimed. */
export async function mailCount(userId: string) {
  const { rows } = await query<{ n: string }>("select count(*)::text as n from mail where user_id = $1 and (read_at is null or claimed_at is null)", [userId]);
  return Number(rows[0]?.n ?? 0);
}

export async function markMailRead(userId: string) {
  await query("update mail set read_at = now() where user_id = $1 and read_at is null", [userId]);
}

/** Live-event boosts (Double $NOTTIES Hour) apply when a reward is earned, so the mailed amount is already final. */
export async function boostedPoints(q: Q, points: number, reason: string) {
  if (points <= 0 || !BOOSTABLE(reason)) return points;
  const { activeEffects } = await import("./events");
  const fx = await activeEffects(q);
  return fx.points !== 1 ? Math.round(points * fx.points) : points;
}

/** Claim one letter's rewards, or every waiting one when `id` is omitted. */
export async function claimMail(userId: string, id?: string) {
  return withTx(async (q) => {
    await requireActive(q, userId);
    const { rows } = await q.query<{ id: string; points: number; crates: number; reason: string | null }>(
      `select id, points, crates, reason from mail where user_id = $1 and claimed_at is null ${id ? "and id = $2" : ""} order by id for update`,
      id ? [userId, id] : [userId],
    );
    if (!rows.length) throw new GameError(id ? "Already claimed" : "Nothing to claim");
    let points = 0;
    let crates = 0;
    for (const m of rows) {
      if (Number(m.points) > 0) points += await addPoints(q, userId, Number(m.points), `mail:${m.reason ?? "letter"}`, String(m.id), `mail:${m.id}`);
      crates += Number(m.crates);
    }
    if (crates) await q.query("update users set crates = crates + $2 where id = $1", [userId, crates]);
    await q.query(`update mail set claimed_at = now(), read_at = coalesce(read_at, now()) where id = any($1::bigint[])`, [rows.map((m) => m.id)]);
    return { points, crates, letters: rows.length };
  });
}

/**
 * A letter to every registered (active) player at once, e.g. "a new timed mission is live".
 * One SQL statement; `key` makes it safe to call twice (each player gets it once).
 */
export async function broadcastMail(q: Q | null, key: string, title: string, body: string) {
  const sql = `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
               select id, 'system', $1, $2, now(), $3 || ':' || id from users where status = 'active'
               on conflict (idem_key) do nothing`;
  const params = [title.slice(0, 140), body.slice(0, 500), `bc:${key}`];
  if (q) await q.query(sql, params);
  else await query(sql, params);
}
