import "server-only";
import { GameError, query, withTx, type Q } from "../db";
import { FRAGMENT_BY_TYPE, type FragmentType } from "./config";
import { addFragment, getSettings, logRisk, requireActive, type UserRow } from "./core";
import { completeTask } from "./tasks";
import { sendMail } from "./mail";

export async function lookupRecipient(handle: string, q?: Q) {
  const h = handle.trim().replace(/^@/, "");
  if (!h) return null;
  const run = q ? q.query.bind(q) : query;
  const u = await run<Pick<UserRow, "id" | "x_username" | "display_name" | "avatar_url" | "ref_code" | "created_at">>(
    `select id, x_username, display_name, avatar_url, ref_code, created_at from users where lower(x_username) = lower($1) or ref_code = upper($1) limit 1`,
    [h],
  );
  const r = u.rows[0];
  return r ? { id: r.id, username: r.x_username, displayName: r.display_name || r.x_username, avatar: r.avatar_url, since: r.created_at } : null;
}

export async function transferFragment(senderId: string, recipientHandle: string, type: FragmentType, qty: number, idemKey: string) {
  if (!FRAGMENT_BY_TYPE[type]) throw new GameError("Unknown fragment");
  if (FRAGMENT_BY_TYPE[type].special) throw new GameError(`${FRAGMENT_BY_TYPE[type].name} can't be traded. It stays with whoever earned it.`);
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new GameError("Quantity must be 1–50");
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");

  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.trade_enabled) throw new GameError("Trading is paused right now.", 503);

    const dup = await q.query("select id from trades where idem_key = $1", [idemKey]);
    if (dup.rows.length) return { replayed: true };

    const sender = await requireActive(q, senderId);
    const recipient = await lookupRecipient(recipientHandle, q);
    if (!recipient) throw new GameError("No player with that username or code");
    if (recipient.id === senderId) throw new GameError("You can't send fragments to yourself");

    const rstatus = (await q.query<{ status: string }>("select status from users where id = $1", [recipient.id])).rows[0];
    if (rstatus?.status !== "active") throw new GameError("That account can't receive fragments right now");

    const inv = (await q.query<{ qty: number }>("select qty from inventory where user_id = $1 and type = $2 for update", [senderId, type])).rows[0];
    if (!inv || Number(inv.qty) < qty) throw new GameError(`You don't have ${qty} × ${FRAGMENT_BY_TYPE[type].name}`);

    // Coordinated-farming tell: lots of outbound transfers in a short window.
    const burst = (await q.query<{ n: string }>("select count(*)::text as n from trades where sender_id = $1 and created_at > now() - interval '1 hour'", [senderId])).rows[0];
    if (Number(burst.n) >= 30) {
      await logRisk(q, senderId, "trade_burst", { hour_count: Number(burst.n) }, 2);
      throw new GameError("Slow down. Too many transfers this hour.", 429);
    }

    const trade = (await q.query<{ id: string }>("insert into trades (sender_id, recipient_id, type, qty, idem_key) values ($1,$2,$3,$4,$5) returning id", [senderId, recipient.id, type, qty, idemKey])).rows[0];
    await addFragment(q, senderId, type, -qty, "trade_out", trade.id, `trade:${trade.id}:out`);
    await addFragment(q, recipient.id, type, qty, "trade_in", trade.id, `trade:${trade.id}:in`);

    await sendMail(q, recipient.id, { kind: "gift", title: `@${sender.x_username} sent you ${qty} × ${FRAGMENT_BY_TYPE[type].name}`, body: "It's already in your stash.", part: type, idem: `gift:${trade.id}` });
    await completeTask(q, sender.id, "first_trade", settings).catch(() => {});
    // Gifting counts for today's daily gift job automatically.
    await completeTask(q, sender.id, "daily_gift", settings).catch(() => {});

    return { replayed: false, tradeId: trade.id, to: recipient.username };
  });
}

export async function tradeHistory(userId: string, limit = 20) {
  const { rows } = await query<{ id: string; type: FragmentType; qty: number; created_at: string; direction: "in" | "out"; other: string }>(
    `select t.id, t.type, t.qty, t.created_at,
            case when t.sender_id = $1 then 'out' else 'in' end as direction,
            case when t.sender_id = $1 then r.x_username else s.x_username end as other
       from trades t join users s on s.id = t.sender_id join users r on r.id = t.recipient_id
      where t.sender_id = $1 or t.recipient_id = $1
      order by t.id desc limit $2`,
    [userId, limit],
  );
  return rows;
}
