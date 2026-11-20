import "server-only";
import { GameError, withTx } from "../db";
import { addPoints, getSettings, logRisk, requireActive } from "./core";
import { sendMail } from "./mail";
import { lookupRecipient } from "./trade";
import { checkReferralProgress } from "./referrals";

/** Send $NOTTIES to another player. Instant, no undo; the recipient gets a letter about it. */
export async function transferPoints(senderId: string, handle: string, amount: number, idemKey: string) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) throw new GameError("Enter a whole amount of $NOTTIES");
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.trade_enabled) throw new GameError("Transfers are paused right now.", 503);
    const dup = await q.query("select 1 from point_transactions where idem_key = $1", [`send:${idemKey}`]);
    if (dup.rows.length) return { replayed: true };

    const sender = await requireActive(q, senderId);
    const to = await lookupRecipient(handle, q);
    if (!to) throw new GameError("No player with that username or code");
    if (to.id === senderId) throw new GameError("You can't send $NOTTIES to yourself");
    const st = (await q.query<{ status: string }>("select status from users where id = $1", [to.id])).rows[0];
    if (st?.status !== "active") throw new GameError("That account can't receive $NOTTIES right now");
    if (Number(sender.points) < amount) throw new GameError(`You only have ${Number(sender.points).toLocaleString()} $NOTTIES`);

    const burst = Number((await q.query<{ n: string }>("select count(*)::text as n from point_transactions where user_id = $1 and reason = 'send_out' and created_at > now() - interval '1 hour'", [senderId])).rows[0].n);
    if (burst >= 30) {
      await logRisk(q, senderId, "send_burst", { hour_count: burst }, 2);
      throw new GameError("Slow down. Too many transfers this hour.", 429);
    }

    await addPoints(q, senderId, -amount, "send_out", to.id, `send:${idemKey}`);
    await addPoints(q, to.id, amount, "send_in", senderId, `send:${idemKey}:in`);
    await sendMail(q, to.id, { kind: "gift", title: `@${sender.x_username} sent you ${amount.toLocaleString()} $NOTTIES`, body: "Already added to your balance.", idem: `sendmail:${idemKey}` });
    return { replayed: false, to: to.username, amount };
  });
}

/**
 * Enter a friend's code after signing up (for people who joined without the link). Only once,
 * never your own code, and never someone you referred yourself.
 */
export async function applyReferralCode(userId: string, code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,16}$/.test(c)) throw new GameError("That code doesn't look right");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    const me = await requireActive(q, userId);
    if (me.referred_by) throw new GameError("You've already used a friend's code");
    const ref = (await q.query<{ id: string; status: string; referred_by: string | null; x_username: string }>("select id, status, referred_by, x_username from users where ref_code = $1", [c])).rows[0];
    if (!ref) throw new GameError("No player with that code");
    if (ref.id === userId) throw new GameError("That's your own code");
    if (ref.referred_by === userId) throw new GameError("You recruited them, so they can't recruit you");
    if (ref.status !== "active") throw new GameError("That code can't be used right now");
    await q.query("update users set referred_by = $2 where id = $1", [userId, ref.id]);
    await q.query("insert into referrals (referrer_id, referee_id) values ($1, $2) on conflict do nothing", [ref.id, userId]);
    // Already played enough? The recruiter gets paid now.
    await checkReferralProgress(q, userId, Number(me.claims), settings);
    return { referrer: ref.x_username };
  });
}
