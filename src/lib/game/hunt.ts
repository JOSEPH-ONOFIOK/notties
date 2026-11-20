import "server-only";
import { randomInt } from "node:crypto";
import { GameError, query, withTx, type Q } from "../db";
import { FRAGMENT_BY_TYPE, FRAGMENT_TYPES, isPart, type FragmentType, type Settings } from "./config";
import { addFragment, addPoints, getSettings, logRisk, requireActive, type UserRow } from "./core";
import { activeEffects } from "./events";
import { pushFeed } from "./feed";
import { RARITY_TIER } from "./level";
import { checkReferralProgress } from "./referrals";

/** Weighted pick, server-side CSPRNG. Weights are admin-configurable; zero disables a drop. */
export function rollFragment(weights: Record<FragmentType, number>): FragmentType {
  const entries = FRAGMENT_TYPES.map((t) => [t, Math.max(0, Number(weights[t]) || 0)] as const).filter(([, w]) => w > 0);
  // Weights may be fractional after event multipliers: scale to integers for randomInt.
  const scaled = entries.map(([t, w]) => [t, Math.round(w * 1000)] as const).filter(([, w]) => w > 0);
  const total = scaled.reduce((a, [, w]) => a + w, 0);
  if (!total) throw new GameError("Crates are empty right now. Vlad is restocking.", 503);
  let r = randomInt(0, total);
  for (const [t, w] of scaled) {
    if (r < w) return t;
    r -= w;
  }
  return scaled[scaled.length - 1][0];
}

/** Effective drop weights right now: base weights × active event multipliers. */
export function effectiveWeights(settings: Settings, drop: Record<FragmentType, number>) {
  // Special items (Vlad's Book) never come out of a crate, whatever the admin weights say.
  return Object.fromEntries(FRAGMENT_TYPES.map((t) => [t, !isPart(t) ? 0 : (Number(settings.drop_weights[t]) || 0) * (drop[t] ?? 1)])) as Record<FragmentType, number>;
}

/** Roll + record one crate for a locked user row. Shared by the timer crate and the shop crate. */
async function openCrate(q: Q, u: UserRow, settings: Settings, source: "timer" | "shop" | "free", idemKey: string) {
  const fx = await activeEffects(q);
  let weights = effectiveWeights(settings, fx.drop);
  const threshold = Math.max(2, Number(settings.pity_threshold) || 10);
  const pityHit = u.pity + 1 >= threshold;
  if (pityHit) weights = Object.fromEntries(FRAGMENT_TYPES.map((t) => [t, RARITY_TIER[FRAGMENT_BY_TYPE[t].rarity] >= 2 ? weights[t] : 0])) as Record<FragmentType, number>;

  const type = rollFragment(weights);
  const def = FRAGMENT_BY_TYPE[type];
  const tier = RARITY_TIER[def.rarity];
  const event = fx.names.join(" + ") || null;

  await addFragment(q, u.id, type, 1, source === "shop" ? "shop_crate" : source === "free" ? "free_crate" : "crate", undefined, `${source}:${idemKey}`);
  const claim = (await q.query<{ id: string }>("insert into crate_claims (user_id, type, rarity, points, idem_key, source, event) values ($1,$2,$3,0,$4,$5,$6) returning id", [u.id, type, def.rarity, `${source}:${idemKey}`, source, event])).rows[0];
  const newPity = tier >= 2 ? 0 : u.pity + 1;
  await q.query("update users set pity = $2, claims = claims + 1, last_seen_at = now() where id = $1", [u.id, newPity]);

  let points = 0;
  if (source === "timer") {
    points = await addPoints(q, u.id, Number(settings.points.crate) || 0, "crate", type, `crate:${idemKey}`);
    await q.query("update crate_claims set points = $2 where id = $1", [claim.id, points]);
  }
  if (tier >= 2) await pushFeed(q, u.id, "pull", { type, rarity: def.rarity, claim: claim.id, event });
  await checkReferralProgress(q, u.id, u.claims + 1, settings);

  return { id: claim.id, type, rarity: def.rarity, points, pity: newPity, pityThreshold: threshold, pityHit, event };
}

export async function claimCrate(userId: string, idemKey: string) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");

  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.claims_enabled) throw new GameError("Crates are locked right now. Check back soon.", 503);
    if (!settings.timer_crates) throw new GameError("Free timer crates are off. Buy a crate with $NOTTIES instead.", 403);

    // Replay of the same request (double-tap, retry) returns the original result, no second roll.
    const replay = (await q.query<{ id: string; type: FragmentType; rarity: string; points: number }>("select id, type, rarity, points from crate_claims where idem_key = $1 and user_id = $2", [`timer:${idemKey}`, userId])).rows[0];
    if (replay) {
      const { next_claim_at, pity } = (await q.query<{ next_claim_at: string; pity: number }>("select next_claim_at, pity from users where id = $1", [userId])).rows[0];
      return { ...replay, replayed: true, nextClaimAt: next_claim_at, pity };
    }

    const u = await requireActive(q, userId); // row lock: two parallel claims serialize here
    const now = Date.now();
    if (u.next_claim_at && new Date(u.next_claim_at).getTime() > now) {
      const early = await q.query<{ n: string }>("select count(*)::text as n from risk_events where user_id = $1 and kind = 'early_claim' and created_at > now() - interval '10 minutes'", [userId]);
      await logRisk(q, userId, "early_claim", { next_claim_at: u.next_claim_at }, Number(early.rows[0].n) > 10 ? 2 : 1);
      throw new GameError("Your next crate isn't ready yet.", 429);
    }

    const fx = await activeEffects(q);
    const minutes = Math.max(1, (Number(settings.crate_cooldown_minutes) || 120) * fx.cooldown);
    const next = new Date(now + minutes * 60_000);
    await q.query("update users set next_claim_at = $2 where id = $1", [userId, next.toISOString()]);
    const r = await openCrate(q, u, settings, "timer", idemKey);
    return { ...r, nextClaimAt: next.toISOString(), replayed: false };
  });
}

const dayStartSql = "date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'";

const buyCooldownMs = (s: Settings) => Math.max(0, Number(s.crate_buy_cooldown_minutes) || 0) * 60_000;

export async function shopStatus(userId: string, settings: Settings) {
  const { rows } = await query<{ n: string; last: string | null }>(`select count(*) filter (where created_at >= ${dayStartSql})::text as n, max(created_at) as last from crate_claims where user_id = $1 and source = 'shop'`, [userId]);
  const bought = Number(rows[0]?.n ?? 0);
  const last = rows[0]?.last ? new Date(rows[0].last).getTime() : 0;
  const next = last && buyCooldownMs(settings) ? last + buyCooldownMs(settings) : 0;
  return { price: Number(settings.crate_price) || 0, left: Math.max(0, (Number(settings.crate_buys_per_day) || 0) - bought), enabled: !!settings.shop_enabled, cooldownMinutes: Math.max(0, Number(settings.crate_buy_cooldown_minutes) || 0), nextBuyAt: next > Date.now() ? new Date(next).toISOString() : null };
}

/** Spend $NOTTIES on a crate. Doesn't touch the free timer; optional cooldown (crate_buy_cooldown_minutes) and a daily cap. */
export async function buyCrate(userId: string, idemKey: string) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.shop_enabled || !settings.claims_enabled) throw new GameError("The crate shop is closed right now.", 503);
    const replay = (await q.query<{ id: string; type: FragmentType; rarity: string }>("select id, type, rarity from crate_claims where idem_key = $1 and user_id = $2", [`shop:${idemKey}`, userId])).rows[0];
    if (replay) return { ...replay, points: 0, replayed: true };

    const u = await requireActive(q, userId);
    const price = Math.max(0, Number(settings.crate_price) || 0);
    const bought = Number((await q.query<{ n: string }>(`select count(*)::text as n from crate_claims where user_id = $1 and source = 'shop' and created_at >= ${dayStartSql}`, [userId])).rows[0].n);
    if (bought >= (Number(settings.crate_buys_per_day) || 0)) throw new GameError("You've bought all your crates today. Back tomorrow.", 429);
    const last = (await q.query<{ last: string | null }>("select max(created_at) as last from crate_claims where user_id = $1 and source = 'shop'", [userId])).rows[0]?.last;
    const wait = last ? new Date(last).getTime() + buyCooldownMs(settings) - Date.now() : 0;
    if (wait > 0) throw new GameError(`You can buy your next crate in ${Math.ceil(wait / 60_000)} min.`, 429);
    if (Number(u.points) < price) throw new GameError(`You need ${price} $NOTTIES for a crate. Do missions to earn more.`);

    await addPoints(q, userId, -price, "shop_crate", undefined, `shopbuy:${idemKey}`);
    const r = await openCrate(q, u, settings, "shop", idemKey);
    return { ...r, spent: price, replayed: false };
  });
}

/** Open one of the free crates the player claimed from their mailbox. No timer, no cost. */
export async function openFreeCrate(userId: string, idemKey: string) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");
  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.claims_enabled) throw new GameError("Crates are locked right now. Check back soon.", 503);
    const replay = (await q.query<{ id: string; type: FragmentType; rarity: string }>("select id, type, rarity from crate_claims where idem_key = $1 and user_id = $2", [`free:${idemKey}`, userId])).rows[0];
    if (replay) return { ...replay, points: 0, replayed: true };

    const u = await requireActive(q, userId);
    if (Number(u.crates) < 1) throw new GameError("No crates left. Buy more in the Market.");
    await q.query("update users set crates = crates - 1 where id = $1", [userId]);
    const r = await openCrate(q, u, settings, "free", idemKey);
    return { ...r, cratesLeft: Number(u.crates) - 1, replayed: false };
  });
}

export async function recentClaims(userId: string, limit = 10) {
  const { rows } = await query<{ type: FragmentType; rarity: string; points: number; created_at: string }>(
    "select type, rarity, points, created_at from crate_claims where user_id = $1 order by id desc limit $2",
    [userId, limit],
  );
  return rows;
}
