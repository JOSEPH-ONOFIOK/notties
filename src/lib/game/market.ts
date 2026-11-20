import "server-only";
import { GameError, withTx } from "../db";
import { FRAGMENT_BY_TYPE, isPart, type FragmentType } from "./config";
import { addFragment, addPoints, getSettings, requireActive } from "./core";

/**
 * The Marketplace: buy any part outright with $NOTTIES at the admin-set price (settings.market_prices).
 * Rare parts are priced high on purpose, so trading stays the cheaper way to finish a set.
 */
export async function buyPart(userId: string, type: FragmentType, qty: number, idemKey: string) {
  const def = FRAGMENT_BY_TYPE[type];
  if (!def || !isPart(type)) throw new GameError("That's not for sale");
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new GameError("Buy 1 to 10 at a time");
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.market_enabled) throw new GameError("The Market is closed right now.", 503);
    const price = Math.max(0, Number(settings.market_prices[type]) || 0);
    if (!price) throw new GameError(`${def.name} isn't for sale right now`);
    const dup = await q.query("select 1 from point_transactions where idem_key = $1", [`market:${idemKey}`]);
    if (dup.rows.length) return { replayed: true, type, qty, spent: 0 };

    const u = await requireActive(q, userId);
    const total = price * qty;
    if (Number(u.points) < total) throw new GameError(`You need ${total.toLocaleString()} $NOTTIES. You have ${Number(u.points).toLocaleString()}.`);
    await addPoints(q, userId, -total, "market", type, `market:${idemKey}`);
    await addFragment(q, userId, type, qty, "market", undefined, `market:${idemKey}:part`);
    return { replayed: false, type, qty, spent: total };
  });
}
