import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { bust, cached } from "../cache";
import { cleanRounds, type RoundCfg } from "./rounds";
import { GameError, one, query, withTx, type Q } from "../db";
import { DEFAULT_SETTINGS, FRAGMENT_BY_TYPE, FRAGMENT_TYPES, type FragmentType, type PlayerStatus, type Settings } from "./config";
import type { XUser } from "../session";

/* ───────────────────────── settings ───────────────────────── */

/** Settings. Inside a transaction (`q`) they're read fresh; elsewhere a 15s cached copy is used. */
export async function getSettings(q?: Q): Promise<Settings> {
  if (q) return loadSettings(q);
  return structuredClone(await cached("settings", 15_000, () => loadSettings()));
}

async function loadSettings(q?: Q): Promise<Settings> {
  const { rows } = await (q ? q.query<{ key: string; value: unknown }>("select key, value from settings") : query<{ key: string; value: unknown }>("select key, value from settings"));
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  // Keep nested defaults for keys an older row may be missing.
  s.points = { ...DEFAULT_SETTINGS.points, ...(s.points as object) };
  // Per-fragment maps keep only today's fragment types, so keys saved for retired parts
  // (goggles, shard…) don't leak into drop odds or the admin forms.
  const known = <T,>(defaults: Record<FragmentType, T>, saved: unknown) => Object.fromEntries(FRAGMENT_TYPES.map((t) => [t, (saved as Record<string, T> | null)?.[t] ?? defaults[t]])) as Record<FragmentType, T>;
  s.drop_weights = known(DEFAULT_SETTINGS.drop_weights, s.drop_weights);
  s.pawn_prices = known(DEFAULT_SETTINGS.pawn_prices, s.pawn_prices);
  s.recipe = known(DEFAULT_SETTINGS.recipe, s.recipe);
  // Vlad's Book is never part of the recipe, whatever an older saved recipe says.
  s.recipe = { ...(s.recipe as object), book: 0 };
  // The mint is free, always.
  s.mint = { ...DEFAULT_SETTINGS.mint, ...(s.mint as object), price: "Free" };
  s.book_cap = Math.max(0, Number(s.book_cap) || 0);
  s.task_rounds = cleanRounds(s.task_rounds as Partial<RoundCfg>);
  s.welcome_crates = Math.max(0, Number(s.welcome_crates) || 0);
  s.referral_crates = Math.max(0, Number(s.referral_crates) || 0);
  return s as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await query(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`, [key, JSON.stringify(value)]);
  bust("settings");
}

/* ───────────────────────── users ───────────────────────── */

export interface UserRow {
  id: string;
  x_id: string;
  x_username: string;
  display_name: string | null;
  avatar_url: string | null;
  ref_code: string;
  referred_by: string | null;
  status: "active" | "suspended";
  points: string;
  lifetime_points: string;
  next_claim_at: string | null;
  claims: number;
  onboarded: boolean;
  created_at: string;
  last_seen_at: string;
  streak: number;
  best_streak: number;
  last_checkin: string | null;
  pity: number;
  crates: number;
  faction: string | null;
}

function makeRefCode(username: string) {
  const base = username.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "NOTTIE";
  return `${base}${randomInt(100, 999)}`;
}

/** Find the player for an X account, creating them (and recording a referral) on first sign-in. */
export async function upsertUser(x: XUser & { createdAt?: string }, refCode?: string | null) {
  return withTx(async (q) => {
    const existing = (await q.query<UserRow>("select * from users where x_id = $1", [x.id])).rows[0];
    if (existing) {
      await q.query(`update users set x_username = $2, display_name = $3, avatar_url = coalesce($4, avatar_url), last_seen_at = now() where id = $1`, [existing.id, x.username, x.name ?? null, x.avatar ?? null]);
      return { user: existing, created: false };
    }

    let code = makeRefCode(x.username);
    for (let i = 0; i < 5; i++) {
      const clash = await q.query("select 1 from users where ref_code = $1", [code]);
      if (!clash.rows.length) break;
      code = makeRefCode(x.username);
    }
    const user = (
      await q.query<UserRow>(
        `insert into users (x_id, x_username, display_name, avatar_url, ref_code) values ($1,$2,$3,$4,$5) returning *`,
        [x.id, x.username, x.name ?? null, x.avatar ?? null, code],
      )
    ).rows[0];

    const settings = await getSettings(q);
    if (settings.welcome_crates > 0) {
      const { sendMail } = await import("./mail");
      await sendMail(q, user.id, { kind: "welcome", title: "Welcome to Robinhood City", body: "Vlad's lab is leaking parts. Here's a free crate to get you started. Collect all 8 parts and build your Nottie.", crates: settings.welcome_crates, idem: `welcome:${user.id}` });
    }

    if (refCode) {
      const referrer = (await q.query<UserRow>("select id, status from users where ref_code = $1", [refCode.toUpperCase()])).rows[0];
      if (referrer && referrer.id !== user.id && referrer.status === "active") {
        await q.query("update users set referred_by = $2 where id = $1", [user.id, referrer.id]);
        await q.query("insert into referrals (referrer_id, referee_id) values ($1, $2) on conflict do nothing", [referrer.id, user.id]);
      }
    }
    // Brand-new X accounts are a sybil signal, not a verdict. Log it for review.
    if (x.createdAt && Date.now() - new Date(x.createdAt).getTime() < 14 * 86400_000) {
      await q.query("insert into risk_events (user_id, kind, detail, severity) values ($1,'new_x_account',$2,1)", [user.id, JSON.stringify({ x_created_at: x.createdAt })]);
    }
    return { user, created: true };
  });
}

export async function getUserByXId(xId: string) {
  return one<UserRow>("select * from users where x_id = $1", [xId]);
}

export async function requireActive(q: Q, userId: string) {
  const u = (await q.query<UserRow>("select * from users where id = $1 for update", [userId])).rows[0];
  if (!u) throw new GameError("Account not found", 401);
  if (u.status !== "active") throw new GameError("This account is under review. Rewards are paused until it clears.", 403);
  return u;
}

/* ───────────────────────── points + inventory helpers (inside a tx) ───────────────────────── */

/** Rewards that live events (e.g. Double Trouble) multiply. Exchanges, spending and admin fixes never are. */
export const BOOSTABLE = (reason: string) => reason === "crate" || reason === "referral" || reason === "forge" || reason.startsWith("task:");

/** Credit or debit TROUBLE, idempotently. Returns the amount actually applied (after event boosts). */
export async function addPoints(q: Q, userId: string, delta: number, reason: string, refId?: string, idemKey?: string): Promise<number> {
  if (delta === 0) return 0;
  if (delta > 0 && BOOSTABLE(reason)) {
    const { activeEffects } = await import("./events");
    const fx = await activeEffects(q);
    if (fx.points !== 1) delta = Math.round(delta * fx.points);
  }
  const ins = await q.query(
    `insert into point_transactions (user_id, delta, reason, ref_id, idem_key) values ($1,$2,$3,$4,$5) on conflict (idem_key) do nothing returning id`,
    [userId, delta, reason, refId ?? null, idemKey ?? null],
  );
  if (!ins.rows.length) return 0; // replayed request
  await q.query(`update users set points = points + $2, lifetime_points = lifetime_points + greatest($2, 0) where id = $1`, [userId, delta]);
  return delta;
}

export async function addFragment(q: Q, userId: string, type: FragmentType, delta: number, reason: string, refId?: string, idemKey?: string) {
  const ins = await q.query(
    `insert into fragment_ledger (user_id, type, delta, reason, ref_id, idem_key) values ($1,$2,$3,$4,$5,$6) on conflict (idem_key) do nothing returning id`,
    [userId, type, delta, reason, refId ?? null, idemKey ?? null],
  );
  if (!ins.rows.length) return false;
  if (delta >= 0) {
    await q.query(
      `insert into inventory (user_id, type, qty) values ($1,$2,$3)
       on conflict (user_id, type) do update set qty = inventory.qty + excluded.qty`,
      [userId, type, delta],
    );
  } else {
    // Guarded decrement: never below zero, and never on a row that doesn't exist.
    const upd = await q.query(`update inventory set qty = qty + $3 where user_id = $1 and type = $2 and qty + $3 >= 0 returning qty`, [userId, type, delta]);
    if (!upd.rows.length) throw new GameError(`Not enough ${FRAGMENT_BY_TYPE[type].name}`);
  }
  return true;
}

export async function getInventory(userId: string, q?: Q): Promise<Record<FragmentType, number>> {
  const run = q ? q.query.bind(q) : query;
  const { rows } = await run<{ type: FragmentType; qty: number }>("select type, qty from inventory where user_id = $1", [userId]);
  const inv = Object.fromEntries(FRAGMENT_TYPES.map((t) => [t, 0])) as Record<FragmentType, number>;
  for (const r of rows) if (r.type in inv) inv[r.type] = Number(r.qty);
  return inv;
}

export function recipeProgress(inv: Record<FragmentType, number>, recipe: Record<FragmentType, number>) {
  let have = 0;
  let need = 0;
  // Only types the recipe asks for get a slot, so Vlad's Book (recipe 0) never shows on the bench.
  const slots = FRAGMENT_TYPES.filter((t) => (recipe[t] ?? 0) > 0).map((t) => {
    const n = recipe[t] ?? 0;
    const h = Math.min(inv[t] ?? 0, n);
    have += h;
    need += n;
    return { type: t, need: n, have: inv[t] ?? 0, done: n > 0 && (inv[t] ?? 0) >= n };
  });
  return { slots, have, need, pct: need ? Math.round((have / need) * 100) : 0, complete: need > 0 && have >= need };
}

export async function logRisk(q: Q, userId: string | null, kind: string, detail?: unknown, severity = 1) {
  await q.query("insert into risk_events (user_id, kind, detail, severity) values ($1,$2,$3,$4)", [userId, kind, JSON.stringify(detail ?? {}), severity]);
}

/* ───────────────────────── derived player view ───────────────────────── */

export interface PlayerView {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  refCode: string;
  status: PlayerStatus;
  accountStatus: "active" | "suspended";
  points: number;
  lifetimePoints: number;
  claims: number;
  nextClaimAt: string | null;
  createdAt: string;
  onboarded: boolean;
  inventory: Record<FragmentType, number>;
  fragments: number;
  progress: ReturnType<typeof recipeProgress>;
  wallet: string | null;
  tasksDone: number;
  referralsVerified: number;
  forgedAt: string | null;
  nottieSeed: number | null;
  gtd: boolean;
  spent: number;
  streak: number;
  bestStreak: number;
  checkedInToday: boolean;
  pity: number;
  faction: string | null;
  /** Free crates waiting to be opened. */
  crates: number;
  /** Letters in the mailbox that are unread or have a reward to claim. */
  mail: number;
}

export async function getPlayer(xId: string): Promise<PlayerView | null> {
  const u = await getUserByXId(xId);
  if (!u) return null;
  const [settings, inv, wallet, tasks, refs, forge, elig, mail] = await Promise.all([
    getSettings(),
    getInventory(u.id),
    one<{ address: string }>("select address from wallets where user_id = $1 and is_primary order by verified_at desc limit 1", [u.id]),
    one<{ n: string }>("select count(*)::text as n from task_completions where user_id = $1", [u.id]),
    one<{ n: string }>("select count(*)::text as n from referrals where referrer_id = $1 and status = 'verified'", [u.id]),
    one<{ created_at: string; nottie_seed: number }>("select created_at, nottie_seed from forge_completions where user_id = $1", [u.id]),
    one<{ status: string }>("select status from mint_eligibility where user_id = $1 and category = 'forge'", [u.id]),
    one<{ n: string }>("select count(*)::text as n from mail where user_id = $1 and (read_at is null or claimed_at is null)", [u.id]),
  ]);
  const progress = recipeProgress(inv, settings.recipe);
  const fragments = Object.values(inv).reduce((a, b) => a + b, 0);
  const gtd = elig?.status === "approved";
  const status: PlayerStatus = forge ? (gtd ? "gtd" : "assembled") : progress.complete ? "ready" : fragments > 0 ? "collecting" : "registered";
  return {
    id: u.id,
    username: u.x_username,
    displayName: u.display_name || u.x_username,
    avatar: u.avatar_url,
    refCode: u.ref_code,
    status,
    accountStatus: u.status,
    points: Number(u.points),
    lifetimePoints: Number(u.lifetime_points),
    claims: u.claims,
    nextClaimAt: u.next_claim_at,
    createdAt: u.created_at,
    onboarded: u.onboarded,
    inventory: inv,
    fragments,
    progress,
    wallet: wallet?.address ?? null,
    tasksDone: Number(tasks?.n ?? 0),
    referralsVerified: Number(refs?.n ?? 0),
    forgedAt: forge?.created_at ?? null,
    nottieSeed: forge?.nottie_seed ?? null,
    gtd,
    spent: Math.max(0, Number(u.lifetime_points) - Number(u.points)),
    ...streakView(u.streak, u.last_checkin),
    bestStreak: u.best_streak,
    pity: u.pity,
    faction: u.faction,
    crates: Number(u.crates) || 0,
    mail: Number(mail?.n ?? 0),
  };
}

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const asDay = (v: string | Date | null) => (v ? (typeof v === "string" ? v.slice(0, 10) : utcDay(v)) : null);

/** A streak only survives if the last roll call was today or yesterday (UTC). */
export function streakView(streak: number, last: string | Date | null) {
  const l = asDay(last);
  const today = utcDay();
  const yesterday = utcDay(new Date(Date.now() - 86400_000));
  return { streak: l === today || l === yesterday ? streak : 0, checkedInToday: l === today };
}

export const newIdem = () => randomBytes(12).toString("hex");
export { FRAGMENT_BY_TYPE };
