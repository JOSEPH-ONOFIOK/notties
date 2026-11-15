import { handler, json } from "@/lib/api";
import { forgeNottie } from "@/lib/game/forge";
import { GameError } from "@/lib/db";

export const POST = handler({ name: "forge", limit: [5, 60_000] }, async (user, req) => {
  const { idem } = await json<{ idem?: string }>(req);
  if (!idem) throw new GameError("Missing idempotency key");
  return { result: await forgeNottie(user.id, idem) };
});
