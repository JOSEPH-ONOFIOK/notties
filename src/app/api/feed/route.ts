import { NextResponse } from "next/server";
import { readFeed } from "@/lib/game/feed";
import { eventTimeline } from "@/lib/game/events";

/** Public: latest big pulls / assemblies / swaps, plus the live event state and server clock. */
export async function GET(req: Request) {
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const [items, ev] = await Promise.all([readFeed(after, 20), eventTimeline()]);
  return NextResponse.json({ ok: true, items, events: ev }, { headers: { "Cache-Control": "no-store" } });
}
