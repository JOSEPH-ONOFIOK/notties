import { handler, json } from "@/lib/api";
import { buyCrate } from "@/lib/game/hunt";
import { GameError } from "@/lib/db";
import { clientIp } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";

export const POST = handler({ name: "buy", limit: [6, 60_000] }, async (user, req) => {
  const { idem, cf } = await json<{ idem?: string; cf?: string }>(req);
  if (!idem) throw new GameError("Missing idempotency key");
  if (!(await verifyTurnstile(cf, clientIp(req)))) throw new GameError("Bot check failed. Refresh and try again.", 403);
  return { result: await buyCrate(user.id, idem) };
});
