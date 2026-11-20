import { handler, json } from "@/lib/api";
import { GameError } from "@/lib/db";
import { applyReferralCode, transferPoints } from "@/lib/game/profile";

export const POST = handler({ name: "profile", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "send" | "code"; to?: string; amount?: number; idem?: string; code?: string }>(req);
  if (b.action === "send") {
    if (!b.to || !b.idem) throw new GameError("Missing fields");
    return { result: await transferPoints(user.id, b.to, Math.floor(Number(b.amount)), b.idem) };
  }
  if (b.action === "code") return { result: await applyReferralCode(user.id, b.code ?? "") };
  throw new GameError("Unknown action");
});
