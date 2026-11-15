import { handler, json } from "@/lib/api";
import { cancelOffer, createOffer, fillOffer, listOffers } from "@/lib/game/offers";
import { GameError } from "@/lib/db";

export const GET = handler({ name: "offers" }, async (user) => listOffers(user.id));

export const POST = handler({ name: "offers", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "create" | "fill" | "cancel"; id?: string; give?: string; giveQty?: number; want?: string; wantQty?: number; to?: string; idem?: string }>(req);
  if (b.action === "create") {
    if (!b.give || !b.want || !b.idem) throw new GameError("Missing fields");
    return { result: await createOffer(user.id, { give: b.give, giveQty: Number(b.giveQty ?? 1), want: b.want, wantQty: Number(b.wantQty ?? 1), to: b.to }, b.idem) };
  }
  if (!b.id || !/^\d+$/.test(b.id)) throw new GameError("Bad offer");
  if (b.action === "fill") return { result: await fillOffer(user.id, b.id) };
  if (b.action === "cancel") return { result: await cancelOffer(user.id, b.id) };
  throw new GameError("Unknown action");
});
