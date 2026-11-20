import { handler, json } from "@/lib/api";
import { GameError } from "@/lib/db";
import type { FragmentType } from "@/lib/game/config";
import { buyCrates, buyPart } from "@/lib/game/market";

export const POST = handler({ name: "market", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ type?: string; qty?: number; idem?: string }>(req);
  if (!b.type || !b.idem) throw new GameError("Missing fields");
  if (b.type === "crate") return { result: await buyCrates(user.id, Math.floor(Number(b.qty ?? 1)), b.idem) };
  return { result: await buyPart(user.id, b.type as FragmentType, Math.floor(Number(b.qty ?? 1)), b.idem) };
});
