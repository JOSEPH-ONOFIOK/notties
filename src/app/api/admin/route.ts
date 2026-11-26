import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { addAllowlist, adjustPlayer, adminIdentity, audit, can, exportEligibility, freezeSnapshot, removeAllowlist, resolveRisk, setAdminRole, setUserStatus, snapshotEntries, upsertTask, type Admin, type Role, archiveExpiredTasks } from "@/lib/game/admin";
import { setSetting } from "@/lib/game/core";
import { createEvent, deleteEvent } from "@/lib/game/events";
import { reviewSubmission } from "@/lib/game/tasks";
import { DEFAULT_SETTINGS, type EventEffects, type Settings } from "@/lib/game/config";

const deny = (msg = "Not an admin") => NextResponse.json({ ok: false, error: msg }, { status: 403 });
const csv = (name: string, body: string) => new NextResponse(body, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${name}"` } });

export async function GET(req: Request) {
  const admin = await adminIdentity();
  if (!admin) return deny();
  const sp = new URL(req.url).searchParams;
  const what = sp.get("export");
  if (what && !can(admin, "owner")) return deny("Owners only");
  if (what === "eligibility") {
    const rows = await exportEligibility();
    await audit(admin.name, "export_eligibility", undefined, { rows: rows.length });
    return csv(`notties-gtd-${new Date().toISOString().slice(0, 10)}.csv`, ["wallet,phase,allocation,source,x_username", ...rows.map((r) => `${r.address},${r.phase},${r.allocation},${r.category},${r.username}`)].join("\n"));
  }
  if (what === "snapshot") {
    const id = sp.get("id") ?? "";
    const rows = await snapshotEntries(id);
    await audit(admin.name, "export_snapshot", id, { rows: rows.length });
    return csv(`notties-snapshot-${id}.csv`, ["wallet,phase,allocation,sources", ...rows.map((r) => `${r.address},${r.phase},${r.allocation},${r.sources}`)].join("\n"));
  }
  if (what === "real" || what === "bots") {
    // Players split by the bot check (see botScores in admin.ts).
    const { botScores, BOT_THRESHOLD } = await import("@/lib/game/admin");
    const rows = (await botScores()).filter((r) => (what === "bots" ? r.score >= BOT_THRESHOLD : r.score < BOT_THRESHOLD));
    await audit(admin.name, `export_${what}`, undefined, { rows: rows.length });
    return csv(`notties-${what === "bots" ? "likely-bots" : "real-players"}-${new Date().toISOString().slice(0, 10)}.csv`, ["x_username,status,notties,wallet,bot_score,signals,joined,last_seen", ...rows.map((r) => [r.x_username, r.status, r.points, r.wallet ?? "", r.score, r.signals.join(" "), new Date(r.created_at).toISOString(), new Date(r.last_seen_at).toISOString()].join(","))].join("\n"));
  }
  if (what === "players") {
    // Every player with their wallet, balance, progress and referrals (handy for checking lists).
    const { rows } = await query<{ x_username: string; ref_code: string; status: string; points: string; claims: number; wallet: string | null; forged: boolean; recruits: number; referrer: string | null; created_at: string }>(
      `select u.x_username, u.ref_code, u.status, u.points::text, u.claims, w.address as wallet, (f.id is not null) as forged,
              (select count(*)::int from referrals r where r.referrer_id = u.id and r.status = 'verified') as recruits,
              (select x_username from users ru where ru.id = u.referred_by) as referrer, u.created_at
         from users u left join wallets w on w.user_id = u.id and w.is_primary left join forge_completions f on f.user_id = u.id
        order by u.id`,
    );
    await audit(admin.name, "export_players", undefined, { rows: rows.length });
    return csv(`notties-players-${new Date().toISOString().slice(0, 10)}.csv`, ["x_username,ref_code,status,notties,crates_opened,wallet,forged,recruits_paid,referred_by,joined", ...rows.map((r) => [r.x_username, r.ref_code, r.status, r.points, r.claims, r.wallet ?? "", r.forged ? "yes" : "no", r.recruits, r.referrer ?? "", new Date(r.created_at).toISOString()].join(","))].join("\n"));
  }
  return NextResponse.json({ ok: true, admin });
}

type Body =
  | { action: "setting"; key: keyof Settings; value: unknown }
  | { action: "status"; userId: string; status: "active" | "suspended"; note?: string }
  | { action: "resolve"; riskId: string }
  | { action: "task"; task: { id: string; title: string; description: string; points: number; kind: string; verify: string; link: string | null; sort: number; active: boolean; starts_at?: string | null; ends_at?: string | null; proof_hint?: string | null; gives_book?: boolean; crates?: number } }
  | { action: "archive_expired" }
  | { action: "war_start"; days: number; airdrop: number }
  | { action: "war_end" }
  | { action: "review"; id: string; approve: boolean }
  | { action: "adjust"; userId: string; points?: number; type?: string; qty?: number; reason: string }
  | { action: "event"; name: string; kind: string; effects: EventEffects; starts_at: string; ends_at: string }
  | { action: "event_delete"; id: string }
  | { action: "allowlist_add"; lines: string; category: string; phase: number; allocation: number; note?: string }
  | { action: "allowlist_remove"; id: string }
  | { action: "snapshot"; label: string; closeForge: boolean }
  | { action: "role"; username: string; role: Role | null };

const NEED: Record<Body["action"], Role> = {
  setting: "owner",
  status: "moderator",
  resolve: "moderator",
  task: "owner",
  archive_expired: "owner",
  war_start: "owner",
  war_end: "owner",
  review: "moderator",
  adjust: "moderator",
  event: "owner",
  event_delete: "owner",
  allowlist_add: "owner",
  allowlist_remove: "owner",
  snapshot: "owner",
  role: "owner",
};

export async function POST(req: Request) {
  const admin: Admin | null = await adminIdentity();
  if (!admin) return deny();
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || !(b.action in NEED)) return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  if (!can(admin, NEED[b.action])) return deny(`Needs ${NEED[b.action]} access`);
  const by = admin.name;
  try {
    let result: unknown = null;
    switch (b.action) {
      case "setting":
        if (!(b.key in DEFAULT_SETTINGS)) throw new Error("Unknown setting");
        await setSetting(b.key, b.value as never);
        await audit(by, "setting", b.key, b.value);
        break;
      case "status":
        await setUserStatus(by, String(b.userId), b.status === "suspended" ? "suspended" : "active", b.note);
        break;
      case "resolve":
        await resolveRisk(by, String(b.riskId));
        break;
      case "task":
        // A blank id gets one made from the title and the round start, e.g. like_post_0911_21.
        if (!b.task.id) {
          const when = b.task.starts_at && !Number.isNaN(Date.parse(b.task.starts_at)) ? new Date(b.task.starts_at) : new Date();
          const slug = b.task.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "mission";
          b.task.id = `${slug}_${String(when.getUTCMonth() + 1).padStart(2, "0")}${String(when.getUTCDate()).padStart(2, "0")}_${String(when.getUTCHours()).padStart(2, "0")}`;
        }
        if (!/^[a-z0-9_]{1,64}$/.test(b.task.id)) throw new Error("Task id: lowercase letters, digits, underscores");
        result = await upsertTask(by, b.task);
        break;
      case "war_start": {
        const { startWar } = await import("@/lib/game/gangwar");
        result = await startWar(by, Number(b.days), Number(b.airdrop));
        await audit(by, "war_start", undefined, { days: b.days, airdrop: b.airdrop });
        break;
      }
      case "war_end": {
        const { settleWar } = await import("@/lib/game/gangwar");
        result = await settleWar(true);
        await audit(by, "war_end", undefined, result ?? {});
        break;
      }
      case "archive_expired":
        result = await archiveExpiredTasks(by);
        break;
      case "review":
        await reviewSubmission(by, String(b.id), !!b.approve);
        await audit(by, b.approve ? "approve_submission" : "reject_submission", String(b.id));
        break;
      case "adjust":
        await adjustPlayer(by, String(b.userId), b);
        break;
      case "event":
        await createEvent(by, b);
        await audit(by, "event_create", b.name, b);
        break;
      case "event_delete":
        await deleteEvent(String(b.id));
        await audit(by, "event_delete", String(b.id));
        break;
      case "allowlist_add":
        result = await addAllowlist(by, b.lines ?? "", b);
        break;
      case "allowlist_remove":
        await removeAllowlist(by, String(b.id));
        break;
      case "snapshot":
        result = await freezeSnapshot(by, b.label ?? "", !!b.closeForge);
        break;
      case "role":
        await setAdminRole(by, b.username, b.role);
        break;
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
