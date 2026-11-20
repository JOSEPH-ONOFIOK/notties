import { NextResponse } from "next/server";
import { getXUser } from "@/lib/session";
import { adminIdentity, audit, can } from "@/lib/game/admin";
import { getUserByXId } from "@/lib/game/core";
import { deleteMessage, postAnnouncement, postChat, readChat, type Channel } from "@/lib/game/chat";

const err = (m: string, status = 400) => NextResponse.json({ ok: false, error: m }, { status });

/** Public read: ?channel=chat|announce&after=<id>. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const channel: Channel = sp.get("channel") === "announce" ? "announce" : "chat";
  const after = Number(sp.get("after") ?? 0) || 0;
  return NextResponse.json({ ok: true, messages: await readChat(channel, after) }, { headers: { "Cache-Control": "no-store" } });
}

/** Players post to chat; admins post announcements and delete messages. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { action?: "post" | "announce" | "delete"; body?: string; id?: string } | null;
  if (!b) return err("Bad request");
  try {
    if (b.action === "announce" || b.action === "delete") {
      const admin = await adminIdentity();
      if (!can(admin, b.action === "announce" ? "owner" : "moderator")) return err("Admins only", 403);
      if (b.action === "announce") {
        await postAnnouncement(admin!.name, b.body ?? "");
        await audit(admin!.name, "announce", undefined, { body: (b.body ?? "").slice(0, 200) });
      } else {
        if (!b.id || !/^\d+$/.test(b.id)) return err("Bad message");
        await deleteMessage(b.id);
        await audit(admin!.name, "chat_delete", b.id);
      }
      return NextResponse.json({ ok: true });
    }
    const x = await getXUser();
    if (!x) return err("Sign in to chat", 401);
    const u = await getUserByXId(x.id);
    if (!u) return err("Sign in to chat", 401);
    await postChat(u.id, u.x_username, b.body ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed");
  }
}
