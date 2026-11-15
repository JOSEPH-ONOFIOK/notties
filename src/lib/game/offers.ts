import "server-only";
import { GameError, query, withTx } from "../db";
import { FRAGMENT_BY_TYPE, type FragmentType } from "./config";
import { addFragment, getSettings, logRisk, requireActive } from "./core";
import { pushFeed } from "./feed";
import { completeTask } from "./tasks";
import { lookupRecipient } from "./trade";

/**
 * The Swap Board: two-sided trades. Posting an offer moves the maker's cards into escrow, so an
 * open offer can always be filled. Filling swaps both sides in one transaction. Cancelling
 * returns the escrow. Nothing ever exists in two places at once.
 */

const MAX_OPEN = 5;
const ok = (t: string): t is FragmentType => t in FRAGMENT_BY_TYPE;
const qtyOk = (n: number) => Number.isInteger(n) && n >= 1 && n <= 20;

export async function createOffer(makerId: string, o: { give: string; giveQty: number; want: string; wantQty: number; to?: string | null }, idemKey: string) {
  if (!ok(o.give) || !ok(o.want)) throw new GameError("Unknown card");
  if (o.give === o.want) throw new GameError("Pick two different cards");
  if (!qtyOk(o.giveQty) || !qtyOk(o.wantQty)) throw new GameError("Quantities must be 1–20");
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");
  const give: FragmentType = o.give;

  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.trade_enabled) throw new GameError("Trading is paused right now.", 503);
    const dup = (await q.query<{ id: string }>("select id from trade_offers where idem_key = $1", [idemKey])).rows[0];
    if (dup) return { id: dup.id, replayed: true };

    await requireActive(q, makerId);
    const open = Number((await q.query<{ n: string }>("select count(*)::text as n from trade_offers where maker_id = $1 and status = 'open'", [makerId])).rows[0].n);
    if (open >= MAX_OPEN) throw new GameError(`You can have ${MAX_OPEN} open offers at once. Cancel one first.`);

    let targetId: string | null = null;
    if (o.to?.trim()) {
      const t = await lookupRecipient(o.to, q);
      if (!t) throw new GameError("No player with that username or code");
      if (t.id === makerId) throw new GameError("You can't offer a swap to yourself");
      targetId = t.id;
    }

    const inv = (await q.query<{ qty: number }>("select qty from inventory where user_id = $1 and type = $2 for update", [makerId, o.give])).rows[0];
    if (!inv || Number(inv.qty) < o.giveQty) throw new GameError(`You don't have ${o.giveQty} × ${FRAGMENT_BY_TYPE[give].name}`);

    const offer = (await q.query<{ id: string }>("insert into trade_offers (maker_id, give_type, give_qty, want_type, want_qty, target_id, idem_key) values ($1,$2,$3,$4,$5,$6,$7) returning id", [makerId, o.give, o.giveQty, o.want, o.wantQty, targetId, idemKey])).rows[0];
    await addFragment(q, makerId, give, -o.giveQty, "escrow", offer.id, `offer:${offer.id}:escrow`);
    return { id: offer.id, replayed: false };
  });
}

export async function fillOffer(takerId: string, offerId: string) {
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.trade_enabled) throw new GameError("Trading is paused right now.", 503);
    const o = (await q.query<{ id: string; maker_id: string; give_type: FragmentType; give_qty: number; want_type: FragmentType; want_qty: number; target_id: string | null; status: string }>("select * from trade_offers where id = $1 for update", [offerId])).rows[0];
    if (!o || o.status !== "open") throw new GameError("That offer is gone. Someone beat you to it.");
    if (o.maker_id === takerId) throw new GameError("That's your own offer");
    if (o.target_id && o.target_id !== takerId) throw new GameError("That offer is reserved for someone else");

    await requireActive(q, takerId);
    const maker = (await q.query<{ status: string }>("select status from users where id = $1", [o.maker_id])).rows[0];
    if (maker?.status !== "active") throw new GameError("That player can't trade right now");

    const inv = (await q.query<{ qty: number }>("select qty from inventory where user_id = $1 and type = $2 for update", [takerId, o.want_type])).rows[0];
    if (!inv || Number(inv.qty) < o.want_qty) throw new GameError(`You need ${o.want_qty} × ${FRAGMENT_BY_TYPE[o.want_type].name} to take this`);

    // Coordinated-farming tell: the same two accounts swapping over and over.
    const pair = Number((await q.query<{ n: string }>("select count(*)::text as n from trade_offers where status = 'filled' and ((maker_id = $1 and taker_id = $2) or (maker_id = $2 and taker_id = $1)) and closed_at > now() - interval '1 day'", [o.maker_id, takerId])).rows[0].n);
    if (pair >= 5) await logRisk(q, takerId, "swap_pair", { with: o.maker_id, count: pair + 1 }, 2);

    await addFragment(q, takerId, o.want_type, -o.want_qty, "swap_out", o.id, `offer:${o.id}:taker_out`);
    await addFragment(q, o.maker_id, o.want_type, o.want_qty, "swap_in", o.id, `offer:${o.id}:maker_in`);
    await addFragment(q, takerId, o.give_type, o.give_qty, "swap_in", o.id, `offer:${o.id}:taker_in`);
    await q.query("update trade_offers set status = 'filled', taker_id = $2, closed_at = now() where id = $1", [o.id, takerId]);
    await pushFeed(q, takerId, "swap", { give: o.give_type, want: o.want_type, offer: o.id });
    for (const u of [takerId, o.maker_id]) await completeTask(q, u, "first_trade", settings).catch(() => {});
    return { ok: true };
  });
}

export async function cancelOffer(makerId: string, offerId: string) {
  return withTx(async (q) => {
    const o = (await q.query<{ id: string; maker_id: string; give_type: FragmentType; give_qty: number; status: string }>("select * from trade_offers where id = $1 for update", [offerId])).rows[0];
    if (!o || o.maker_id !== makerId) throw new GameError("Not your offer");
    if (o.status !== "open") throw new GameError("That offer is already closed");
    await q.query("update trade_offers set status = 'cancelled', closed_at = now() where id = $1", [o.id]);
    await addFragment(q, makerId, o.give_type, o.give_qty, "escrow_return", o.id, `offer:${o.id}:return`);
    return { ok: true };
  });
}

export type OfferRow = { id: string; maker: string; maker_avatar: string | null; maker_id: string; give_type: FragmentType; give_qty: number; want_type: FragmentType; want_qty: number; target: string | null; target_id: string | null; created_at: string };

export async function listOffers(viewerId: string) {
  const base = `select o.id, m.x_username as maker, m.avatar_url as maker_avatar, o.maker_id, o.give_type, o.give_qty, o.want_type, o.want_qty, t.x_username as target, o.target_id, o.created_at
                  from trade_offers o join users m on m.id = o.maker_id left join users t on t.id = o.target_id
                 where o.status = 'open' and m.status = 'active'`;
  const [open, mine] = await Promise.all([
    query<OfferRow>(`${base} and o.maker_id <> $1 and (o.target_id is null or o.target_id = $1) order by (o.target_id = $1) desc nulls last, o.id desc limit 60`, [viewerId]),
    query<OfferRow>(`${base} and o.maker_id = $1 order by o.id desc`, [viewerId]),
  ]);
  return { open: open.rows, mine: mine.rows };
}
