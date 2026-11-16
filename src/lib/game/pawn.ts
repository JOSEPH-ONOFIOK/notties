import "server-only";
import { GameError, withTx } from "../db";
import { FRAGMENT_BY_TYPE, type FragmentType } from "./config";
import { addFragment, addPoints, getSettings, requireActive } from "./core";

/**
 * The Pawn Shop: sell duplicate fragments for TROUBLE. House rule — you always keep at least one of
 * each type, so nobody sells their way out of ever assembling a Nottie.
 */
export async function pawnFragment(userId: string, type: FragmentType, qty: number, idemKey: string) {
  if (!FRAGMENT_BY_TYPE[type]) throw new GameError("Unknown fragment");
  if (FRAGMENT_BY_TYPE[type].special) throw new GameError(`Hood won't touch ${FRAGMENT_BY_TYPE[type].name}. It stays with whoever earned it.`);
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new GameError("Quantity must be 1–50");
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");

  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.pawn_enabled) throw new GameError("The Pawn Shop is shut. Hood took the key.", 503);

    const dup = await q.query("select 1 from point_transactions where idem_key = $1", [`pawn:${idemKey}`]);
    if (dup.rows.length) return { replayed: true, points: 0 };

    await requireActive(q, userId);
    const inv = (await q.query<{ qty: number }>("select qty from inventory where user_id = $1 and type = $2 for update", [userId, type])).rows[0];
    const have = Number(inv?.qty ?? 0);
    const sellable = Math.max(0, have - 1);
    if (qty > sellable) throw new GameError(sellable === 0 ? "Keep at least one of each fragment" : `You can sell at most ${sellable}`);

    const unit = Math.max(0, Number(settings.pawn_prices[type]) || 0);
    const points = unit * qty;
    await addFragment(q, userId, type, -qty, "pawn", undefined, `pawn:${idemKey}:frag`);
    await q.query("insert into pawn_sales (user_id, type, qty, points) values ($1,$2,$3,$4)", [userId, type, qty, points]);
    await addPoints(q, userId, points, "pawn", type, `pawn:${idemKey}`);
    return { replayed: false, points };
  });
}
