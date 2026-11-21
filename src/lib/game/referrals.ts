import "server-only";
import { query, type Q } from "../db";
import type { Settings } from "./config";
import { sendMail } from "./mail";
import { addPoints } from "./core";

/**
 * A referral pays out only after the new player has actually played: opened `referral_qualify_claims`
 * crates. Opening a link, or signing up and leaving, earns the referrer nothing.
 */
export async function checkReferralProgress(q: Q, refereeId: string, claimsNow: number, settings: Settings) {
  const need = Math.max(0, Number(settings.referral_qualify_claims ?? 0));
  if (claimsNow < need) return;
  // If a recruit mission is set (e.g. "engage the launch post"), they must have finished it too.
  const mission = String(settings.referral_task ?? "").trim();
  if (mission) {
    const done = await q.query("select 1 from task_completions where user_id = $1 and task_id = $2 limit 1", [refereeId, mission]);
    if (!done.rows.length) return;
  }
  const ref = (await q.query<{ id: string; referrer_id: string; status: string }>("select id, referrer_id, status from referrals where referee_id = $1 for update", [refereeId])).rows[0];
  if (!ref || ref.status !== "pending") return;

  const referrer = (await q.query<{ status: string }>("select status from users where id = $1", [ref.referrer_id])).rows[0];
  if (!referrer || referrer.status !== "active") {
    await q.query("update referrals set status = 'held' where id = $1", [ref.id]);
    return;
  }
  await q.query("update referrals set status = 'verified', verified_at = now() where id = $1", [ref.id]);
  // The recruiter's bonus ($NOTTIES + free crates) arrives in their mailbox.
  const who = (await q.query<{ x_username: string }>("select x_username from users where id = $1", [refereeId])).rows[0]?.x_username ?? "a recruit";
  // The bonus goes straight onto the recruiter's balance; the letter is just a heads-up.
  const pts = await addPoints(q, ref.referrer_id, Number(settings.points.referral) || 0, "referral", refereeId, `referral:${ref.id}`);
  if (settings.referral_crates > 0) await q.query("update users set crates = crates + $2 where id = $1", [ref.referrer_id, settings.referral_crates]);
  await sendMail(q, ref.referrer_id, {
    kind: "referral",
    title: `@${who} joined your crew: +${pts.toLocaleString()} $NOTTIES`,
    body: "Your recruit bonus is already in your balance.",
    idem: `referral:${ref.id}`,
  });
}

export async function referralSummary(userId: string) {
  const { rows } = await query<{ status: string; n: string }>("select status, count(*)::text as n from referrals where referrer_id = $1 group by status", [userId]);
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  const recent = (
    await query<{ username: string; status: string; created_at: string }>(
      `select u.x_username as username, r.status, r.created_at from referrals r join users u on u.id = r.referee_id where r.referrer_id = $1 order by r.id desc limit 20`,
      [userId],
    )
  ).rows;
  const points = await query<{ s: string }>("select coalesce(sum(delta),0)::text as s from point_transactions where user_id = $1 and reason in ('referral', 'mail:referral')", [userId]);
  return {
    total: Object.values(by).reduce((a, b) => a + b, 0),
    verified: by.verified ?? 0,
    pending: by.pending ?? 0,
    rejected: (by.rejected ?? 0) + (by.held ?? 0),
    points: Number(points.rows[0]?.s ?? 0),
    recent,
  };
}

/**
 * Pay any recruiter whose recruit already qualifies but was never paid (e.g. after the rules
 * changed). Runs from housekeeping; each one is its own small transaction.
 */
export async function settlePendingReferrals(limit = 200) {
  const { withTx } = await import("../db");
  const { getSettings } = await import("./core");
  const settings = await getSettings();
  const { rows } = await query<{ referee_id: string; claims: number }>(
    "select r.referee_id, u.claims from referrals r join users u on u.id = r.referee_id where r.status = 'pending' and u.status = 'active' order by r.id limit $1",
    [limit],
  );
  for (const r of rows) await withTx((q) => checkReferralProgress(q, r.referee_id, Number(r.claims), settings)).catch(() => {});
}
