/**
 * Mission rounds. Fresh missions drop at fixed local hours (by default 9:00 and 21:00 WAT), and
 * each round runs until the next drop, so with two drop hours every round lasts 12 hours. A timed
 * mission belongs to one round: it appears when the round starts and disappears when it ends, so
 * yesterday's missions clear themselves. Shared by the server, the admin editor and the player page.
 */
export type RoundCfg = { hours: number[]; utc_offset: number; label: string };
export type Round = { start: string; end: string; label: string };

const H = 3600_000;
const D = 24 * H;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function cleanRounds(cfg: Partial<RoundCfg> | null | undefined): RoundCfg {
  const hours = [...new Set((cfg?.hours ?? [9, 21]).map(Number).filter((h) => Number.isInteger(h) && h >= 0 && h < 24))].sort((a, b) => a - b);
  const off = Number(cfg?.utc_offset);
  return { hours: hours.length ? hours : [9, 21], utc_offset: Number.isFinite(off) && off >= -12 && off <= 14 ? off : 1, label: (cfg?.label ?? "WAT").slice(0, 12) };
}

/** Every drop moment from yesterday to `days` ahead, in UTC milliseconds. */
function drops(cfg: RoundCfg, now: number, days: number) {
  const off = cfg.utc_offset * H;
  const localMidnight = Math.floor((now + off) / D) * D;
  const out: number[] = [];
  for (let d = -1; d <= days; d++) for (const h of cfg.hours) out.push(localMidnight + d * D + h * H - off);
  return out.sort((a, b) => a - b);
}

/** "Thu 9:00 PM" in the round's own time zone. */
export function roundLabel(cfg: RoundCfg, at: number) {
  const local = new Date(at + cfg.utc_offset * H);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  return `${DAYS[local.getUTCDay()]} ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** The round running right now. */
export function currentRound(cfg: RoundCfg, now = Date.now()): Round {
  const all = drops(cfg, now, 2);
  const i = all.findLastIndex((t) => t <= now);
  const start = all[i];
  const end = all[i + 1];
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), label: roundLabel(cfg, start) };
}

/** The current round and the next `n - 1`, for the admin round picker. */
export function upcomingRounds(cfg: RoundCfg, n = 6, now = Date.now()): Round[] {
  const all = drops(cfg, now, Math.ceil(n / cfg.hours.length) + 2);
  const i = all.findLastIndex((t) => t <= now);
  return all.slice(i, i + n).map((start, k) => ({ start: new Date(start).toISOString(), end: new Date(all[i + k + 1]).toISOString(), label: roundLabel(cfg, start) }));
}
