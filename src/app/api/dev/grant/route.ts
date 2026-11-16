import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { withTx } from "@/lib/db";
import { FRAGMENT_TYPES, PART_TYPES, type FragmentType } from "@/lib/game/config";
import { addFragment, newIdem } from "@/lib/game/core";

/**
 * Development only: hand the signed-in player fragments so the Forge/Trade/Pawn flows can be
 * tested without waiting on crate timers.
 *   /api/dev/grant?type=body&n=1     one specific fragment
 *   /api/dev/grant?all=1              one of everything (a full recipe)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const u = await requireUser();
  const sp = request.nextUrl.searchParams;
  const n = Math.min(20, Math.max(1, Number(sp.get("n")) || 1));
  const types = sp.get("all") ? PART_TYPES : [sp.get("type") as FragmentType].filter((t) => FRAGMENT_TYPES.includes(t));
  if (!types.length) return NextResponse.json({ ok: false, error: "type or all required" }, { status: 400 });
  await withTx(async (q) => {
    for (const t of types) await addFragment(q, u.id, t, n, "admin", "dev-grant", `dev:${newIdem()}`);
  });
  return NextResponse.redirect(new URL(sp.get("back") ?? "/inventory", request.url));
}
