import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { proofFor } from "@/lib/game/admin";

/** Public: Merkle proofs for a wallet from the latest frozen snapshot (for the mint page / contract). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const address = sp.get("address") ?? "";
  if (!isAddress(address)) return NextResponse.json({ ok: false, error: "Invalid address" }, { status: 400 });
  const r = await proofFor(address, sp.get("snapshot") ?? undefined);
  if (!r) return NextResponse.json({ ok: false, error: "No snapshot frozen yet" }, { status: 404 });
  return NextResponse.json({ ok: true, ...r });
}
