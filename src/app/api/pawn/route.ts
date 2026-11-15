import { handler, json } from "@/lib/api";
import { pawnFragment } from "@/lib/game/pawn";
import { GameError } from "@/lib/db";
import type { FragmentType } from "@/lib/game/config";

export const POST = handler({ name: "pawn", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ type?: FragmentType; qty?: number; idem?: string }>(req);
  if (!b.type || !b.idem) throw new GameError("Missing fields");
  return { result: await pawnFragment(user.id, b.type, Number(b.qty ?? 1), b.idem) };
});
