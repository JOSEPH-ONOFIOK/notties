import { NextResponse } from "next/server";
import { eventTimeline } from "@/lib/game/events";

export async function GET() {
  return NextResponse.json({ ok: true, ...(await eventTimeline()) }, { headers: { "Cache-Control": "no-store" } });
}
