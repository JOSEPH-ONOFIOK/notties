import { handler, json } from "@/lib/api";
import { GameError } from "@/lib/db";
import { finishRun, shareClaim, shareClick, startRun } from "@/lib/game/runner";
import { canPlayGame, getSettings } from "@/lib/game/core";

export const POST = handler({ name: "runner", limit: [40, 60_000] }, async (user, req) => {
  if (!canPlayGame(user.x_username, await getSettings())) throw new GameError("Lab Escape isn't open yet.", 403);
  const b = await json<{ action?: "start" | "finish" | "share_click" | "share_claim"; id?: string; score?: number; goo?: number }>(req);
  if (b.action === "share_click") {
    await shareClick(user.id);
    return {};
  }
  if (b.action === "share_claim") return { result: await shareClaim(user.id) };
  if (b.action === "start") return { result: await startRun(user.id) };
  if (b.action === "finish") return { result: await finishRun(user.id, String(b.id ?? ""), Number(b.score), Number(b.goo)) };
  throw new GameError("Unknown action");
});
