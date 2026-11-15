import { NextResponse } from "next/server";
import { addAllowlist, adjustPlayer, adminIdentity, audit, can, exportEligibility, freezeSnapshot, removeAllowlist, resolveRisk, setAdminRole, setUserStatus, snapshotEntries, upsertTask, type Admin, type Role } from "@/lib/game/admin";
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
  return NextResponse.json({ ok: true, admin });
}

type Body =
  | { action: "setting"; key: keyof Settings; value: unknown }
  | { action: "status"; userId: string; status: "active" | "suspended"; note?: string }
  | { action: "resolve"; riskId: string }
  | { action: "task"; task: { id: string; title: string; description: string; points: number; kind: string; verify: string; link: string | null; sort: number; active: boolean; starts_at?: string | null; ends_at?: string | null; proof_hint?: string | null } }
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
        if (!/^[a-z0-9_]{1,64}$/.test(b.task.id)) throw new Error("Task id: lowercase letters, digits, underscores");
        await upsertTask(by, b.task);
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
