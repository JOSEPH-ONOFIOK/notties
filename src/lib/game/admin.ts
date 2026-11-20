import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { bust } from "../cache";
import { query, withTx } from "../db";
import { getXUser } from "../session";
import { getInventory, type UserRow } from "./core";

export type Role = "owner" | "moderator" | "viewer";
export type Admin = { name: string; role: Role };
const RANK: Record<Role, number> = { viewer: 0, moderator: 1, owner: 2 };
export const can = (a: Admin | null, need: Role) => !!a && RANK[a.role] >= RANK[need];

/**
 * Admin access, three ways:
 *  - X usernames in ADMIN_X_USERNAMES are owners.
 *  - The admins table grants owner / moderator / viewer to other X usernames (owners manage it).
 *  - The ADMIN_KEY cookie (set via /api/admin/key?key=…) is an owner.
 * Username-based access needs a verified X sign-in: guest-mode names are typed, not proven, so
 * they never count. Every change is written to admin_actions.
 *   viewer: read everything · moderator: + suspend, clear flags, corrections, review proofs
 *   owner: + settings, events, tasks, allowlist, snapshots, roles, exports
 */
export async function adminIdentity(): Promise<Admin | null> {
  const x = await getXUser();
  const verified = !!x && /^\d+$/.test(x.id);
  if (x && verified) {
    const u = x.username.toLowerCase();
    const owners = (process.env.ADMIN_X_USERNAMES ?? "").split(",").map((s) => s.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
    if (owners.includes(u)) return { name: `@${x.username}`, role: "owner" };
    const row = (await query<{ role: Role }>("select role from admins where x_username = $1", [u])).rows[0];
    if (row) return { name: `@${x.username}`, role: row.role };
  }
  const key = process.env.ADMIN_KEY;
  const got = (await cookies()).get("nt_admin")?.value;
  if (key && got && key.length === got.length && timingSafeEqual(Buffer.from(key), Buffer.from(got))) return { name: x ? `@${x.username} (key)` : "admin-key", role: "owner" };
  return null;
}

export async function listAdmins() {
  return (await query<{ x_username: string; role: Role; added_by: string; created_at: string }>("select * from admins order by created_at")).rows;
}
export async function setAdminRole(by: string, username: string, role: Role | null) {
  const u = username.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_]{1,15}$/.test(u)) throw new Error("Not a valid X username");
  if (role) await query("insert into admins (x_username, role, added_by) values ($1,$2,$3) on conflict (x_username) do update set role = excluded.role", [u, role, by]);
  else await query("delete from admins where x_username = $1", [u]);
  await audit(by, role ? "set_role" : "remove_role", u, { role });
}

/** Manual correction: move a player's $NOTTIES and/or cards, with a reason in the audit log. */
export async function adjustPlayer(by: string, userId: string, a: { points?: number; type?: string; qty?: number; reason: string }) {
  const { addFragment, addPoints, newIdem } = await import("./core");
  const { FRAGMENT_BY_TYPE } = await import("./config");
  if (!a.reason?.trim()) throw new Error("A reason is required");
  await withTx(async (q) => {
    const u = (await q.query<{ points: string }>("select points from users where id = $1 for update", [userId])).rows[0];
    if (!u) throw new Error("Player not found");
    const pts = Math.trunc(Number(a.points) || 0);
    if (pts) {
      if (Number(u.points) + pts < 0) throw new Error("That would make their $NOTTIES negative");
      await addPoints(q, userId, pts, "admin", a.reason.slice(0, 120), `adj:${newIdem()}`);
    }
    const qty = Math.trunc(Number(a.qty) || 0);
    if (qty && a.type) {
      if (!(a.type in FRAGMENT_BY_TYPE)) throw new Error("Unknown card");
      await addFragment(q, userId, a.type as never, qty, "admin", a.reason.slice(0, 120), `adj:${newIdem()}`);
    }
  });
  await audit(by, "adjust", userId, a);
}

/* ── extra allowlist (partners, communities, manual approvals) ── */
export async function listAllowlist() {
  return (await query<{ id: string; address: string; category: string; phase: number; allocation: number; note: string | null; created_at: string }>("select * from allowlist_entries order by category, id desc limit 5000")).rows;
}
export async function addAllowlist(by: string, lines: string, d: { category: string; phase: number; allocation: number; note?: string }) {
  const { getAddress, isAddress } = await import("viem");
  const cat = d.category.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 40);
  if (!cat) throw new Error("Category required");
  let added = 0;
  const bad: string[] = [];
  await withTx(async (q) => {
    for (const raw of lines.split(/\r?\n/)) {
      const parts = raw.split(/[,\s;]+/).filter(Boolean);
      if (!parts.length) continue;
      const [addr, ph, al] = parts;
      if (!isAddress(addr)) {
        bad.push(addr);
        continue;
      }
      const phase = Math.max(1, Math.min(9, Number(ph) || d.phase));
      const allocation = Math.max(1, Math.min(50, Number(al) || d.allocation));
      await q.query(
        `insert into allowlist_entries (address, category, phase, allocation, note, added_by) values ($1,$2,$3,$4,$5,$6)
         on conflict (address, category) do update set phase = excluded.phase, allocation = excluded.allocation, note = excluded.note`,
        [getAddress(addr).toLowerCase(), cat, phase, allocation, d.note ?? null, by],
      );
      added++;
    }
  });
  await audit(by, "allowlist_add", cat, { added, bad: bad.length });
  return { added, bad };
}
export async function removeAllowlist(by: string, id: string) {
  await query("delete from allowlist_entries where id = $1", [id]);
  await audit(by, "allowlist_remove", id);
}

/* ── snapshots + Merkle roots ── */
type SnapRow = { address: string; phase: number; allocation: number; sources: string };

/** Everything eligible right now: assembled players (active, with a primary wallet) + the extra allowlist. */
export async function currentEligibility(): Promise<SnapRow[]> {
  const forge = (await exportEligibility()).map((r) => ({ address: r.address.toLowerCase(), phase: r.phase, allocation: r.allocation, sources: r.category }));
  const extra = (await listAllowlist()).map((r) => ({ address: r.address.toLowerCase(), phase: r.phase, allocation: r.allocation, sources: r.category }));
  const m = new Map<string, SnapRow>();
  for (const r of [...forge, ...extra]) {
    const k = `${r.address}:${r.phase}`;
    const cur = m.get(k);
    if (!cur) m.set(k, { ...r });
    else {
      cur.allocation = Math.max(cur.allocation, r.allocation);
      if (!cur.sources.split("+").includes(r.sources)) cur.sources += `+${r.sources}`;
    }
  }
  return [...m.values()].sort((a, b) => a.phase - b.phase || a.address.localeCompare(b.address));
}

export async function freezeSnapshot(by: string, label: string, closeForge: boolean) {
  const { buildTree } = await import("../merkle");
  const rows = await currentEligibility();
  const phases = [...new Set(rows.map((r) => r.phase))].sort();
  const roots: Record<string, string> = {};
  const counts: Record<string, number> = {};
  for (const ph of phases) {
    const t = buildTree(rows.filter((r) => r.phase === ph).map((r) => r.address));
    roots[ph] = t.root;
    counts[ph] = t.size;
  }
  const id = await withTx(async (q) => {
    const snap = (await q.query<{ id: string }>("insert into snapshots (label, roots, counts, created_by) values ($1,$2,$3,$4) returning id", [label.trim() || `Snapshot ${new Date().toISOString().slice(0, 16)}`, JSON.stringify(roots), JSON.stringify(counts), by])).rows[0];
    for (const r of rows) await q.query("insert into snapshot_entries (snapshot_id, address, phase, allocation, sources) values ($1,$2,$3,$4,$5)", [snap.id, r.address, r.phase, r.allocation, r.sources]);
    if (closeForge) await q.query("insert into settings (key, value) values ('forge_enabled','false'::jsonb) on conflict (key) do update set value = 'false'::jsonb, updated_at = now()");
    return snap.id;
  });
  bust("settings");
  await audit(by, "freeze_snapshot", id, { roots, counts, closeForge });
  return { id, roots, counts };
}

export async function listSnapshots() {
  return (await query<{ id: string; label: string; roots: Record<string, string>; counts: Record<string, number>; created_by: string; created_at: string }>("select * from snapshots order by id desc limit 20")).rows;
}
export async function snapshotEntries(id: string) {
  return (await query<SnapRow>("select address, phase, allocation, sources from snapshot_entries where snapshot_id = $1 order by phase, address", [id])).rows;
}

const treeCache = new Map<string, Awaited<ReturnType<typeof import("../merkle").buildTree>>>();
/** Proofs for one wallet against the latest (or a given) frozen snapshot, one per phase it's in. */
export async function proofFor(address: string, snapshotId?: string) {
  const { buildTree } = await import("../merkle");
  const snap = (await query<{ id: string; roots: Record<string, string>; label: string }>(snapshotId ? "select id, roots, label from snapshots where id = $1" : "select id, roots, label from snapshots order by id desc limit 1", snapshotId ? [snapshotId] : [])).rows[0];
  if (!snap) return null;
  const a = address.toLowerCase();
  const mine = (await query<SnapRow>("select address, phase, allocation, sources from snapshot_entries where snapshot_id = $1 and address = $2", [snap.id, a])).rows;
  const out = [];
  for (const r of mine) {
    const key = `${snap.id}:${r.phase}`;
    let t = treeCache.get(key);
    if (!t) {
      t = buildTree((await query<{ address: string }>("select address from snapshot_entries where snapshot_id = $1 and phase = $2", [snap.id, r.phase])).rows.map((x) => x.address));
      treeCache.set(key, t);
    }
    out.push({ phase: r.phase, allocation: r.allocation, sources: r.sources, root: t.root, proof: t.proof(a) });
  }
  return { snapshot: snap.id, label: snap.label, entries: out };
}

export async function audit(admin: string, action: string, target?: string, detail?: unknown) {
  await query("insert into admin_actions (admin, action, target, detail) values ($1,$2,$3,$4)", [admin, action, target ?? null, JSON.stringify(detail ?? {})]);
}

export async function searchPlayers(qstr: string, limit = 30) {
  const like = `%${qstr.trim().replace(/^@/, "").toLowerCase()}%`;
  return (
    await query<UserRow & { forged: boolean; wallet: string | null; risk: number }>(
      `select u.*, (f.id is not null) as forged, w.address as wallet,
              (select count(*)::int from risk_events r where r.user_id = u.id and not r.resolved) as risk
         from users u left join forge_completions f on f.user_id = u.id
         left join wallets w on w.user_id = u.id and w.is_primary
        where $1 = '%%' or lower(u.x_username) like $1 or u.ref_code like upper($1) or u.x_id = $2
        order by u.id desc limit $3`,
      [like, qstr.trim(), limit],
    )
  ).rows;
}

export async function playerDetail(id: string) {
  const u = (await query<UserRow>("select * from users where id = $1", [id])).rows[0];
  if (!u) return null;
  const [inv, wallets, points, frags, trades, risk, refs, forge, tasks] = await Promise.all([
    getInventory(id),
    query("select address, is_primary, verified_at from wallets where user_id = $1", [id]),
    query("select delta, reason, ref_id, created_at from point_transactions where user_id = $1 order by id desc limit 50", [id]),
    query("select type, delta, reason, ref_id, created_at from fragment_ledger where user_id = $1 order by id desc limit 50", [id]),
    query(
      `select t.id, t.type, t.qty, t.created_at, s.x_username as sender, r.x_username as recipient from trades t join users s on s.id = t.sender_id join users r on r.id = t.recipient_id where t.sender_id = $1 or t.recipient_id = $1 order by t.id desc limit 50`,
      [id],
    ),
    query("select id, kind, detail, severity, resolved, created_at from risk_events where user_id = $1 order by id desc limit 50", [id]),
    query(`select u.x_username, r.status, r.created_at from referrals r join users u on u.id = r.referee_id where r.referrer_id = $1 order by r.id desc`, [id]),
    query("select created_at, nottie_seed from forge_completions where user_id = $1", [id]),
    query("select task_id, day::text as day, created_at from task_completions where user_id = $1 order by id desc", [id]),
  ]);
  const referrer = u.referred_by ? (await query<{ x_username: string }>("select x_username from users where id = $1", [u.referred_by])).rows[0]?.x_username : null;
  return { user: u, inventory: inv, wallets: wallets.rows, points: points.rows, fragments: frags.rows, trades: trades.rows, risk: risk.rows, referrals: refs.rows, forge: forge.rows[0] ?? null, tasks: tasks.rows, referrer };
}

export async function setUserStatus(admin: string, id: string, status: "active" | "suspended", note?: string) {
  await withTx(async (q) => {
    await q.query("update users set status = $2 where id = $1", [id, status]);
    if (status === "suspended") await q.query("update mint_eligibility set status = 'revoked' where user_id = $1", [id]);
    else await q.query("update mint_eligibility set status = 'approved' where user_id = $1 and status = 'revoked'", [id]);
  });
  await audit(admin, status === "suspended" ? "suspend" : "restore", id, { note });
}

export async function resolveRisk(admin: string, id: string) {
  await query("update risk_events set resolved = true where id = $1", [id]);
  await audit(admin, "resolve_risk", id);
}

export async function riskQueue(limit = 100) {
  return (
    await query<{ id: string; user_id: string; username: string; kind: string; detail: unknown; severity: number; created_at: string; n: number }>(
      `select r.id, r.user_id, u.x_username as username, r.kind, r.detail, r.severity, r.created_at,
              (select count(*)::int from risk_events x where x.user_id = r.user_id and not x.resolved) as n
         from risk_events r left join users u on u.id = r.user_id where not r.resolved order by r.severity desc, r.id desc limit $1`,
      [limit],
    )
  ).rows;
}

export async function overview() {
  const g = async (sql: string) => Number((await query<{ n: string }>(sql)).rows[0].n);
  const [players, suspended, forged, gtd, claims24, trades24, points, risk, walletsLinked] = await Promise.all([
    g("select count(*)::text as n from users"),
    g("select count(*)::text as n from users where status = 'suspended'"),
    g("select count(*)::text as n from forge_completions"),
    g("select count(*)::text as n from mint_eligibility where status = 'approved'"),
    g("select count(*)::text as n from crate_claims where created_at > now() - interval '24 hours'"),
    g("select count(*)::text as n from trades where created_at > now() - interval '24 hours'"),
    g("select coalesce(sum(lifetime_points),0)::text as n from users"),
    g("select count(*)::text as n from risk_events where not resolved"),
    g("select count(distinct user_id)::text as n from wallets"),
  ]);
  const supply = (await query<{ type: string; n: string }>("select type, sum(qty)::text as n from inventory group by type")).rows;
  return { players, suspended, forged, gtd, claims24, trades24, points, risk, walletsLinked, supply: Object.fromEntries(supply.map((s) => [s.type, Number(s.n)])) };
}

export async function exportEligibility() {
  return (
    await query<{ address: string; phase: number; allocation: number; category: string; username: string }>(
      `select w.address, e.phase, e.allocation, e.category, u.x_username as username
         from mint_eligibility e join users u on u.id = e.user_id join wallets w on w.user_id = u.id and w.is_primary
        where e.status = 'approved' and u.status = 'active' order by e.phase, e.id`,
    )
  ).rows;
}

/** Switch off every mission whose late window has closed, so the admin list only shows what matters. */
export async function archiveExpiredTasks(admin: string) {
  const { getSettings } = await import("./core");
  const hours = (await getSettings()).late_window_hours;
  const { rows } = await query<{ id: string }>("update tasks set active = false where active and ends_at is not null and ends_at + make_interval(hours => $1::int) < now() returning id", [hours]);
  bust("book:");
  await audit(admin, "archive_expired_tasks", undefined, { count: rows.length });
  return { archived: rows.length };
}

export async function listAllTasks() {
  return (await query("select * from tasks order by sort, id")).rows;
}

export async function upsertTask(admin: string, t: { id: string; title: string; description: string; points: number; kind: string; verify: string; link: string | null; sort: number; active: boolean; starts_at?: string | null; ends_at?: string | null; proof_hint?: string | null; gives_book?: boolean; crates?: number }) {
  const when = (v?: string | null) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
  await query(
    `insert into tasks (id, title, description, points, kind, verify, link, sort, active, starts_at, ends_at, proof_hint, gives_book, crates) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     on conflict (id) do update set title = excluded.title, description = excluded.description, points = excluded.points, kind = excluded.kind, verify = excluded.verify, link = excluded.link, sort = excluded.sort, active = excluded.active, starts_at = excluded.starts_at, ends_at = excluded.ends_at, proof_hint = excluded.proof_hint, gives_book = excluded.gives_book, crates = excluded.crates`,
    [t.id, t.title, t.description, t.points, t.kind, t.verify, t.link, t.sort, t.active, when(t.starts_at), when(t.ends_at), t.proof_hint ?? null, !!t.gives_book, Math.max(0, Math.min(10, Math.round(Number(t.crates ?? 0)) || 0))],
  );
  bust("book:");
  await audit(admin, "upsert_task", t.id, t);
  // Players who already did this task and assembled get their book right away.
  if (t.gives_book) {
    const { backfillBooks } = await import("./book");
    return backfillBooks();
  }
  return { given: 0 };
}
