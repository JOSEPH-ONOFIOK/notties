import { handler } from "@/lib/api";
import { GameError } from "@/lib/db";

/** Crates are bought in the Market (they go to your crate stash) and opened on Hunt. */
export const POST = handler({ name: "buy", limit: [6, 60_000] }, async () => {
  throw new GameError("Buy crates in the Market, then open them on Hunt.");
});
