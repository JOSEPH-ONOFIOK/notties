import "server-only";
import { bust, cached } from "../cache";
import { query, type Q } from "../db";
import { FRAGMENT_TYPES, type EventEffects, type FragmentType, type RecurringEvent } from "./config";
import { getSettings } from "./core";

/**
 * Live events. Two sources, both evaluated on the server's clock (UTC) so every player is in the
 * same event at the same moment and drops change the instant it starts or ends:
 *  - recurring: weekly windows from settings.recurring_events (e.g. Portal Storm every weekend)
 *  - one-off:   rows in the events table that admins schedule
 */

export type LiveEvent = { key: string; name: string; kind: string; effects: EventEffects; starts_at: string; ends_at: string; recurring: boolean };

const H = 3600_000;

/** Expand recurring rules into concrete windows from yesterday to +8 days, merging back-to-back days. */
function recurringWindows(rules: RecurringEvent[], now: number): LiveEvent[] {
  const out: LiveEvent[] = [];
  const day0 = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  for (const r of rules) {
    if (!r.enabled || !r.days?.length) continue;
    const wins: [number, number][] = [];
    for (let d = -2; d <= 9; d++) {
      const dayStart = day0 + d * 24 * H;
      const dow = new Date(dayStart).getUTCDay();
      if (!r.days.includes(dow)) continue;
      const s = dayStart + Math.max(0, Math.min(24, r.start_hour)) * H;
      const e = dayStart + Math.max(0, Math.min(24, r.end_hour)) * H;
      if (e > s) wins.push([s, e]);
    }
    wins.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const w of wins) {
      const last = merged[merged.length - 1];
      if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
      else merged.push([...w]);
    }
    for (const [s, e] of merged) out.push({ key: r.key, name: r.name, kind: r.kind, effects: r.effects, starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), recurring: true });
  }
  return out;
}

export async function eventTimeline(q?: Q, nowMs = Date.now()) {
  const settings = await getSettings(q);
  type Row = { id: string; name: string; kind: string; effects: EventEffects; starts_at: string; ends_at: string };
  const sql = "select id, name, kind, effects, starts_at, ends_at from events where ends_at > now() - interval '1 day' and starts_at < now() + interval '30 days' order by starts_at";
  // Outside a transaction the rows are cached; active/next are still worked out from the exact time below.
  const rows = q ? (await q.query<Row>(sql)).rows : await cached("events", 30_000, async () => (await query<Row>(sql)).rows);
  const oneOff: LiveEvent[] = rows.map((r) => ({ key: `e${r.id}`, name: r.name, kind: r.kind, effects: r.effects, starts_at: new Date(r.starts_at).toISOString(), ends_at: new Date(r.ends_at).toISOString(), recurring: false }));
  const all = [...recurringWindows(settings.recurring_events ?? [], nowMs), ...oneOff];
  const active = all.filter((e) => Date.parse(e.starts_at) <= nowMs && nowMs < Date.parse(e.ends_at));
  const upcoming = all.filter((e) => Date.parse(e.starts_at) > nowMs).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return { active, next: upcoming[0] ?? null, upcoming: upcoming.slice(0, 6), serverNow: new Date(nowMs).toISOString() };
}

/** Multiply together the effects of every active event. */
export function combine(events: LiveEvent[]) {
  const drop = Object.fromEntries(FRAGMENT_TYPES.map((t) => [t, 1])) as Record<FragmentType, number>;
  let points = 1;
  let cooldown = 1;
  for (const e of events) {
    for (const [t, m] of Object.entries(e.effects.drop_mult ?? {})) if (t in drop && Number(m) > 0) drop[t as FragmentType] *= Number(m);
    if (Number(e.effects.points_mult) > 0) points *= Number(e.effects.points_mult);
    if (Number(e.effects.cooldown_mult) > 0) cooldown *= Number(e.effects.cooldown_mult);
  }
  return { drop, points, cooldown, names: events.map((e) => e.name) };
}

export async function activeEffects(q?: Q) {
  const t = await eventTimeline(q);
  return combine(t.active);
}

export async function createEvent(admin: string, e: { name: string; kind: string; effects: EventEffects; starts_at: string; ends_at: string }) {
  if (!e.name?.trim()) throw new Error("Name required");
  const s = Date.parse(e.starts_at);
  const en = Date.parse(e.ends_at);
  if (!(s < en)) throw new Error("End must be after start");
  await query("insert into events (name, kind, effects, starts_at, ends_at, created_by) values ($1,$2,$3,$4,$5,$6)", [e.name.trim(), e.kind || "custom", JSON.stringify(e.effects ?? {}), new Date(s).toISOString(), new Date(en).toISOString(), admin]);
  bust("events");
}

export async function deleteEvent(id: string) {
  await query("delete from events where id = $1", [id]);
  bust("events");
}

export async function listEvents() {
  return (await query<{ id: string; name: string; kind: string; effects: EventEffects; starts_at: string; ends_at: string; created_by: string }>("select * from events where ends_at > now() - interval '7 days' order by starts_at desc limit 50")).rows;
}
