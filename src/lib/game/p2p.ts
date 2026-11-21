import "server-only";
import { GameError, query, withTx } from "../db";
import { FRAGMENT_BY_TYPE, isPart, type FragmentType } from "./config";
import { addFragment, addPoints, getSettings, requireActive } from "./core";
import { sendMail } from "./mail";

/**
 * Player-to-player market. The house doesn't sell parts; players do.
 *  - sell: list a card for N $NOTTIES. The card is held until someone buys it or you cancel.
 *  - buy:  offer N $NOTTIES for a card. The $NOTTIES are held until someone sells or you cancel.
 * Everything moves inside one transaction with row locks, so nothing can be sold twice.
 */
export type Listing = { id: string; kind: "sell" | "buy"; type: FragmentType; price: number; user: string; mine: boolean; at: string };

const MAX_OPEN = 10;
const okPrice = (n: number) => Number.isInteger(n) && n >= 1 && n <= 1_000_000;

export async function listMarket(viewerId: string) {
  const { rows } = await query<{ id: string; kind: "sell" | "buy"; type: FragmentType; price: number; user_id: string; username: string; created_at: string }>(
    `select l.id, l.kind, l.type, l.price, l.user_id, u.x_username as username, l.created_at
       from market_listings l join users u on u.id = l.user_id
      where l.status = 'open' and u.status = 'active'
      order by l.kind, l.price, l.id limit 300`,
  );
  return rows.map((r): Listing => ({ id: String(r.id), kind: r.kind, type: r.type, price: Number(r.price), user: r.username, mine: String(r.user_id) === String(viewerId), at: new Date(r.created_at).toISOString() }));
}

export async function createListing(userId: string, kind: "sell" | "buy", type: FragmentType, price: number, idem: string) {
  if (kind !== "sell" && kind !== "buy") throw new GameError("Bad listing");
  if (!isPart(type)) throw new GameError("That card can't be traded");
  if (!okPrice(price)) throw new GameError("Set a price between 1 and 1,000,000 $NOTTIES");
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idem)) throw new GameError("Bad request");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.market_enabled) throw new GameError("The Market is closed right now.", 503);
    const dup = (await q.query<{ id: string }>("select id from market_listings where idem_key = $1", [idem])).rows[0];
    if (dup) return { id: String(dup.id), replayed: true };
    const u = await requireActive(q, userId);
    const open = Number((await q.query<{ n: string }>("select count(*)::text as n from market_listings where user_id = $1 and status = 'open'", [userId])).rows[0].n);
    if (open >= MAX_OPEN) throw new GameError(`You can have ${MAX_OPEN} open listings. Cancel one first.`);
    const row = (await q.query<{ id: string }>("insert into market_listings (kind, user_id, type, price, idem_key) values ($1,$2,$3,$4,$5) returning id", [kind, userId, type, price, idem])).rows[0];
    if (kind === "sell") {
      const inv = (await q.query<{ qty: number }>("select qty from inventory where user_id = $1 and type = $2 for update", [userId, type])).rows[0];
      if (!inv || Number(inv.qty) < 1) throw new GameError(`You don't have a ${FRAGMENT_BY_TYPE[type].name} to sell`);
      await addFragment(q, userId, type, -1, "listing", row.id, `listing:${row.id}:hold`);
    } else {
      if (Number(u.points) < price) throw new GameError(`You need ${price.toLocaleString()} $NOTTIES to make that offer`);
      await addPoints(q, userId, -price, "bid", row.id, `listing:${row.id}:hold`);
    }
    return { id: String(row.id), replayed: false };
  });
}

/** Take someone's listing: buy their card, or sell them yours. */
export async function fillListing(takerId: string, id: string) {
  if (!/^\d+$/.test(id)) throw new GameError("Bad listing");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.market_enabled) throw new GameError("The Market is closed right now.", 503);
    const l = (await q.query<{ id: string; kind: "sell" | "buy"; user_id: string; type: FragmentType; price: number; status: string }>("select * from market_listings where id = $1 for update", [id])).rows[0];
    if (!l || l.status !== "open") throw new GameError("That listing is gone. Someone beat you to it.");
    if (String(l.user_id) === String(takerId)) throw new GameError("That's your own listing");
    const taker = await requireActive(q, takerId);
    const maker = (await q.query<{ status: string }>("select status from users where id = $1", [l.user_id])).rows[0];
    if (maker?.status !== "active") throw new GameError("That player can't trade right now");
    const name = FRAGMENT_BY_TYPE[l.type].name;
    const price = Number(l.price);
    if (l.kind === "sell") {
      // Taker pays, gets the held card; seller gets paid.
      if (Number(taker.points) < price) throw new GameError(`You need ${price.toLocaleString()} $NOTTIES`);
      await addPoints(q, takerId, -price, "market_buy", l.id, `listing:${l.id}:pay`);
      await addPoints(q, l.user_id, price, "market_sale", l.id, `listing:${l.id}:earn`);
      await addFragment(q, takerId, l.type, 1, "market_buy", l.id, `listing:${l.id}:card`);
      await sendMail(q, l.user_id, { kind: "swap", title: `@${taker.x_username} bought your ${name}`, body: `You got ${price.toLocaleString()} $NOTTIES. Already in your balance.`, part: l.type, idem: `listing:${l.id}:mail` });
    } else {
      // Taker gives a card, gets the held $NOTTIES; buyer gets the card.
      const inv = (await q.query<{ qty: number }>("select qty from inventory where user_id = $1 and type = $2 for update", [takerId, l.type])).rows[0];
      if (!inv || Number(inv.qty) < 1) throw new GameError(`You need a ${name} to sell`);
      await addFragment(q, takerId, l.type, -1, "market_sale", l.id, `listing:${l.id}:give`);
      await addFragment(q, l.user_id, l.type, 1, "market_buy", l.id, `listing:${l.id}:card`);
      await addPoints(q, takerId, price, "market_sale", l.id, `listing:${l.id}:earn`);
      await sendMail(q, l.user_id, { kind: "swap", title: `@${taker.x_username} sold you a ${name}`, body: `Your offer of ${price.toLocaleString()} $NOTTIES was taken. The card is in your stash.`, part: l.type, idem: `listing:${l.id}:mail` });
    }
    await q.query("update market_listings set status = 'filled', taker_id = $2, closed_at = now() where id = $1", [l.id, takerId]);
    return { kind: l.kind, type: l.type, price };
  });
}

export async function cancelListing(userId: string, id: string) {
  if (!/^\d+$/.test(id)) throw new GameError("Bad listing");
  return withTx(async (q) => {
    const l = (await q.query<{ id: string; kind: "sell" | "buy"; user_id: string; type: FragmentType; price: number; status: string }>("select * from market_listings where id = $1 for update", [id])).rows[0];
    if (!l || String(l.user_id) !== String(userId)) throw new GameError("Not your listing");
    if (l.status !== "open") throw new GameError("Already closed");
    if (l.kind === "sell") await addFragment(q, userId, l.type, 1, "listing_return", l.id, `listing:${l.id}:return`);
    else await addPoints(q, userId, Number(l.price), "bid_refund", l.id, `listing:${l.id}:refund`);
    await q.query("update market_listings set status = 'cancelled', closed_at = now() where id = $1", [l.id]);
    return { ok: true };
  });
}
