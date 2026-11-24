import "server-only";
import { GameError, query, withTx } from "../db";
import { bust, cached } from "../cache";
import { addPoints, getSettings, requireActive } from "./core";

/**
 * Lab Escape: the runner game is played in the browser; the server only starts and finishes a
 * run. It times every run itself and rejects scores that couldn't happen in that time, then pays
 * goo as $NOTTIES up to a daily cap.
 */
const MAX_RUN_MS = 30 * 60_000;
// Generous ceilings for an honest run (the game tops out well below these).
const MAX_SCORE_PER_SEC = 90;
const MAX_GOO_PER_SEC = 1.6;

export async function startRun(userId: string) {
  return withTx(async (q) => {
    await requireActive(q, userId);
    // Abandon any unfinished run (closed with no reward).
    await q.query("update runner_runs set ended_at = now() where user_id = $1 and ended_at is null", [userId]);
    const r = (await q.query<{ id: string }>("insert into runner_runs (user_id) values ($1) returning id", [userId])).rows[0];
    return { id: String(r.id) };
  });
}

export async function finishRun(userId: string, id: string, score: number, goo: number) {
  if (!/^\d+$/.test(id)) throw new GameError("Bad run");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    const run = (await q.query<{ user_id: string; started_at: string; ended_at: string | null }>("select user_id, started_at, ended_at from runner_runs where id = $1 for update", [id])).rows[0];
    if (!run || String(run.user_id) !== String(userId)) throw new GameError("Bad run");
    if (run.ended_at) throw new GameError("That run is already over");
    const secs = Math.max(0, (Date.now() - new Date(run.started_at).getTime()) / 1000);
    if (secs * 1000 > MAX_RUN_MS) throw new GameError("That run took too long");
    // Clamp to what's physically possible in the time the server saw.
    const s = Math.max(0, Math.min(Math.floor(Number(score) || 0), Math.floor(secs * MAX_SCORE_PER_SEC)));
    const g = Math.max(0, Math.min(Math.floor(Number(goo) || 0), Math.floor(secs * MAX_GOO_PER_SEC) + 2));
    const earned = Number((await q.query<{ n: string }>("select coalesce(sum(reward),0)::text as n from runner_runs where user_id = $1 and day = (now() at time zone 'utc')::date", [userId])).rows[0].n);
    const cap = Math.max(0, Number(settings.runner_daily_cap) || 0);
    const reward = Math.max(0, Math.min(g * (Number(settings.runner_goo_value) || 0), cap - earned));
    await q.query("update runner_runs set ended_at = now(), score = $2, goo = $3, reward = $4 where id = $1", [id, s, g, reward]);
    if (reward > 0) await addPoints(q, userId, reward, "runner", id, `runner:${id}`);
    const best = Number((await q.query<{ n: string }>("select coalesce(max(score),0)::text as n from runner_runs where user_id = $1 and day = (now() at time zone 'utc')::date", [userId])).rows[0].n);
    bust("runner:board");
    return { score: s, goo: g, reward, earnedToday: earned + reward, cap, best };
  });
}

/** Today's top runs (best score per player). */
export async function runnerBoard() {
  return cached("runner:board", 20_000, async () => {
    const { rows } = await query<{ username: string; avatar: string | null; score: number }>(
      `select u.x_username as username, u.avatar_url as avatar, max(r.score)::int as score
         from runner_runs r join users u on u.id = r.user_id
        where r.day = (now() at time zone 'utc')::date and r.ended_at is not null and u.status = 'active'
        group by u.id order by score desc limit 10`,
    );
    return rows;
  });
}

export async function myRunnerToday(userId: string) {
  const { rows } = await query<{ best: number; earned: number; runs: number }>(
    "select coalesce(max(score),0)::int as best, coalesce(sum(reward),0)::int as earned, count(*)::int as runs from runner_runs where user_id = $1 and day = (now() at time zone 'utc')::date and ended_at is not null",
    [userId],
  );
  return rows[0] ?? { best: 0, earned: 0, runs: 0 };
}

const TODAY = "(now() at time zone 'utc')::date";

/** Remember that the player opened the "post your score" link (the claim must come a bit later). */
export async function shareClick(userId: string) {
  await query(`insert into runner_shares (user_id, day) values ($1, ${TODAY}) on conflict (user_id, day) do nothing`, [userId]);
}

/** Pay the daily "posted my score" bonus, once per UTC day, after they've played today. */
export async function shareClaim(userId: string) {
  return withTx(async (q) => {
    const settings = await getSettings(q);
    await requireActive(q, userId);
    const sh = (await q.query<{ clicked_at: string; claimed_at: string | null }>(`select clicked_at, claimed_at from runner_shares where user_id = $1 and day = ${TODAY} for update`, [userId])).rows[0];
    if (!sh) throw new GameError("Tap Post first");
    if (sh.claimed_at) throw new GameError("Already claimed today. Come back tomorrow!");
    if (Date.now() - new Date(sh.clicked_at).getTime() < 8_000) throw new GameError("Post it first, then claim in a few seconds");
    const played = (await q.query(`select 1 from runner_runs where user_id = $1 and day = ${TODAY} and ended_at is not null and score > 0 limit 1`, [userId])).rows.length > 0;
    if (!played) throw new GameError("Play a run today first");
    const reward = Math.max(0, Number(settings.runner_share_reward) || 0);
    await q.query(`update runner_shares set claimed_at = now() where user_id = $1 and day = ${TODAY}`, [userId]);
    if (reward) await addPoints(q, userId, reward, "runner_share", undefined, `runnershare:${userId}:${new Date().toISOString().slice(0, 10)}`);
    return { reward };
  });
}

export async function sharedToday(userId: string) {
  const { rows } = await query(`select 1 from runner_shares where user_id = $1 and day = ${TODAY} and claimed_at is not null`, [userId]);
  return rows.length > 0;
}
