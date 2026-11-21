import { handler, json } from "@/lib/api";
import { GameError } from "@/lib/db";
import type { FragmentType } from "@/lib/game/config";
import { buyCrates } from "@/lib/game/market";
import { cancelListing, createListing, fillListing } from "@/lib/game/p2p";

/**
 * Crates are bought from the house. Parts are only traded between players:
 * list (sell a card / offer $NOTTIES for one), fill (take a listing) and cancel.
 */
export const POST = handler({ name: "market", limit: [30, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "list" | "fill" | "cancel"; kind?: "sell" | "buy"; type?: string; qty?: number; price?: number; id?: string; idem?: string }>(req);
  if (b.action === "list") {
    if (!b.kind || !b.type || !b.idem) throw new GameError("Missing fields");
    return { result: await createListing(user.id, b.kind, b.type as FragmentType, Math.floor(Number(b.price)), b.idem) };
  }
  if (b.action === "fill") return { result: await fillListing(user.id, String(b.id ?? "")) };
  if (b.action === "cancel") return { result: await cancelListing(user.id, String(b.id ?? "")) };
  if (b.type === "crate") {
    if (!b.idem) throw new GameError("Missing fields");
    return { result: await buyCrates(user.id, Math.floor(Number(b.qty ?? 1)), b.idem) };
  }
  throw new GameError("Parts are only sold by other players. List an offer instead.");
});
