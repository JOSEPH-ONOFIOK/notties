import { handler, json } from "@/lib/api";
import { joinFaction } from "@/lib/game/social";
import { GameError } from "@/lib/db";

export const POST = handler({ name: "faction", limit: [5, 60_000] }, async (user, req) => {
  const { faction } = await json<{ faction?: string }>(req);
  if (!faction) throw new GameError("Pick a gang");
  return { result: await joinFaction(user.id, faction) };
});
