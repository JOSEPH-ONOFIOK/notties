import { NextResponse } from "next/server";
import { handler, json, requireUser } from "@/lib/api";
import { lookupRecipient, transferFragment } from "@/lib/game/trade";
import { GameError } from "@/lib/db";
import type { FragmentType } from "@/lib/game/config";

export const POST = handler({ name: "trade", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ to?: string; type?: FragmentType; qty?: number; idem?: string }>(req);
  if (!b.to || !b.type || !b.idem) throw new GameError("Missing fields");
  const result = await transferFragment(user.id, b.to, b.type, Number(b.qty ?? 1), b.idem);
  return { result };
});

export async function GET(req: Request) {
  try {
    const me = await requireUser();
    const handle = new URL(req.url).searchParams.get("handle") ?? "";
    const r = await lookupRecipient(handle);
    if (!r) return NextResponse.json({ ok: true, recipient: null });
    return NextResponse.json({ ok: true, recipient: { ...r, self: r.id === me.id } });
  } catch (e) {
    const status = e instanceof GameError ? e.status : 500;
    return NextResponse.json({ ok: false, error: e instanceof GameError ? e.message : "Lookup failed" }, { status });
  }
}
