import "server-only";
import { GameError, query, withTx, type Q } from "../db";
import type { Settings } from "./config";
import { getSettings, logRisk, requireActive, streakView, utcDay } from "./core";
import { awardBookIfEarned } from "./book";
import { pushFeed } from "./feed";
import { boostedPoints, sendMail } from "./mail";

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  points: number;
  kind: "once" | "daily";
  verify: "auto" | "link" | "wallet" | "trade" | "manual";
  link: string | null;
  sort: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  proof_hint: string | null;
  gives_book: boolean;
  crates: number;
}

const ONCE_DAY = "1970-01-01";
const todayUtc = () => new Date().toISOString().slice(0, 10);

export async function listTasks(userId: string) {
  const tasks = (await query<TaskRow>("select * from tasks where active order by sort, id")).rows;
  const done = (await query<{ task_id: string; day: string; created_at: string }>("select task_id, day::text as day, created_at from task_completions where user_id = $1", [userId])).rows;
  const clicks = (await query<{ task_id: string; clicked_at: string }>("select task_id, clicked_at from task_clicks where user_id = $1", [userId])).rows;
  const subs = (await query<{ task_id: string; status: string }>("select task_id, status from task_submissions where user_id = $1", [userId])).rows;
  const today = todayUtc();
  return tasks
    .filter((t) => (!t.starts_at || new Date(t.starts_at) <= new Date()) && (!t.ends_at || new Date(t.ends_at) >= new Date()))
    .map((t) => {
      const completed = done.some((d) => d.task_id === t.id && (t.kind === "once" || d.day === today));
      const clicked = clicks.find((c) => c.task_id === t.id)?.clicked_at ?? null;
      return { ...t, completed, clicked, submission: subs.find((x) => x.task_id === t.id)?.status ?? null };
    });
}

/** Record that the player opened a link task. The claim must come a few seconds later. */
export async function clickTask(userId: string, taskId: string) {
  await query("insert into task_clicks (user_id, task_id) values ($1,$2) on conflict (user_id, task_id) do update set clicked_at = least(task_clicks.clicked_at, now())", [userId, taskId]);
}

/** Internal: award a task inside an existing transaction (used by wallet linking, trades, etc.). */
export async function completeTask(q: Q, userId: string, taskId: string, settings: Settings) {
  const t = (await q.query<TaskRow>("select * from tasks where id = $1 and active", [taskId])).rows[0];
  if (!t) throw new GameError("Task not available");
  const day = t.kind === "daily" ? todayUtc() : ONCE_DAY;
  const ins = await q.query("insert into task_completions (user_id, task_id, day) values ($1,$2,$3) on conflict do nothing returning id", [userId, taskId, day]);
  if (!ins.rows.length) throw new GameError(t.kind === "daily" ? "Already checked in today" : "Already completed");
  let pts = taskId in settings.points ? Number(settings.points[taskId as keyof Settings["points"]]) : Number(t.points);
  if (taskId === "daily_checkin") {
    // Streak: consecutive UTC days of roll call. Reward climbs with the streak (settings.streak_bonus).
    const u = (await q.query<{ streak: number; best_streak: number; last_checkin: string | null }>("select streak, best_streak, last_checkin from users where id = $1 for update", [userId])).rows[0];
    const alive = streakView(u.streak, u.last_checkin).streak;
    const streak = alive + 1;
    const ladder = (settings.streak_bonus?.length ? settings.streak_bonus : [pts]).map(Number);
    pts = ladder[Math.min(streak, ladder.length) - 1] ?? pts;
    await q.query("update users set streak = $2, best_streak = greatest(best_streak, $2), last_checkin = $3 where id = $1", [userId, streak, utcDay()]);
    if (streak === 7 || streak === 30 || streak === 100) await pushFeed(q, userId, "streak", { days: streak });
  }
  // The reward goes to the mailbox: TROUBLE (boosted now if an event is live) plus free crates.
  pts = await boostedPoints(q, pts, `task:${taskId}`);
  const crates = Math.max(0, Number(t.crates) || 0);
  await sendMail(q, userId, {
    kind: "reward",
    title: `Mission done: ${t.title}`,
    body: crates ? "Claim it to add the crates to your Hunt page." : null,
    points: pts,
    crates,
    reason: `task:${taskId}`,
    idem: `task:${userId}:${taskId}:${day}`,
  });
  if (taskId === "onboarding") await q.query("update users set onboarded = true where id = $1", [userId]);
  if (t.gives_book) await awardBookIfEarned(q, userId, settings);
  return { points: pts, crates };
}

/** Player-initiated claim. Checks the task's verification method before paying. */
export async function claimTask(userId: string, taskId: string) {
  return withTx(async (q) => {
    const settings = await getSettings(q);
    await requireActive(q, userId);
    const t = (await q.query<TaskRow>("select * from tasks where id = $1 and active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())", [taskId])).rows[0];
    if (!t) throw new GameError("That mission has ended. Fresh ones drop every round.");

    if (t.verify === "link") {
      const c = (await q.query<{ clicked_at: string }>("select clicked_at from task_clicks where user_id = $1 and task_id = $2", [userId, taskId])).rows[0];
      if (!c) throw new GameError("Open the link first");
      if (Date.now() - new Date(c.clicked_at).getTime() < 8_000) {
        await logRisk(q, userId, "fast_task", { task: taskId }, 1);
        throw new GameError("That was quick. Give it a moment, then claim.");
      }
    } else if (t.verify === "wallet") {
      const w = await q.query("select 1 from wallets where user_id = $1", [userId]);
      if (!w.rows.length) throw new GameError("Link a wallet first");
    } else if (t.verify === "trade") {
      const tr = await q.query("select 1 from trades where sender_id = $1 union all select 1 from trade_offers where status = 'filled' and (maker_id = $1 or taker_id = $1) limit 1", [userId]);
      if (!tr.rows.length) throw new GameError("Send or swap a card with someone first");
    } else if (t.verify === "manual") {
      throw new GameError("Submit your proof and the team will review it");
    }

    return completeTask(q, userId, taskId, settings);
  });
}

/** Proof for a manually reviewed task. Resubmitting is allowed after a rejection. */
export async function submitTask(userId: string, taskId: string, proof: string) {
  const p = proof.trim().slice(0, 500);
  if (p.length < 4) throw new GameError("Add a link or a short note as proof");
  return withTx(async (q) => {
    await requireActive(q, userId);
    const t = (await q.query<TaskRow>("select * from tasks where id = $1 and active and verify = 'manual' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())", [taskId])).rows[0];
    if (!t) throw new GameError("Task not available");
    const done = await q.query("select 1 from task_completions where user_id = $1 and task_id = $2", [userId, taskId]);
    if (done.rows.length) throw new GameError("Already completed");
    const cur = (await q.query<{ status: string }>("select status from task_submissions where user_id = $1 and task_id = $2", [userId, taskId])).rows[0];
    if (cur?.status === "pending") throw new GameError("Already submitted. Hang tight.");
    await q.query(
      `insert into task_submissions (user_id, task_id, proof) values ($1,$2,$3)
       on conflict (user_id, task_id) do update set proof = excluded.proof, status = 'pending', created_at = now(), reviewed_at = null, reviewed_by = null`,
      [userId, taskId, p],
    );
    return { status: "pending" };
  });
}

export async function reviewSubmission(admin: string, id: string, approve: boolean) {
  return withTx(async (q) => {
    const s = (await q.query<{ user_id: string; task_id: string; status: string }>("select user_id, task_id, status from task_submissions where id = $1 for update", [id])).rows[0];
    if (!s || s.status !== "pending") throw new GameError("Nothing to review");
    await q.query("update task_submissions set status = $2, reviewed_by = $3, reviewed_at = now() where id = $1", [id, approve ? "approved" : "rejected", admin]);
    if (approve) await completeTask(q, s.user_id, s.task_id, await getSettings(q));
    else {
      const t = (await q.query<{ title: string }>("select title from tasks where id = $1", [s.task_id])).rows[0];
      await sendMail(q, s.user_id, { kind: "review", title: `Not approved: ${t?.title ?? s.task_id}`, body: "The team couldn't verify your proof. Fix it and submit again on the Mission Board.", idem: `review:${id}:${Date.now()}` });
    }
  });
}

export async function pendingSubmissions() {
  return (
    await query<{ id: string; username: string; user_id: string; task_id: string; title: string; proof: string; created_at: string }>(
      `select s.id, u.x_username as username, s.user_id, s.task_id, t.title, s.proof, s.created_at
         from task_submissions s join users u on u.id = s.user_id join tasks t on t.id = s.task_id
        where s.status = 'pending' order by s.id asc limit 100`,
    )
  ).rows;
}
