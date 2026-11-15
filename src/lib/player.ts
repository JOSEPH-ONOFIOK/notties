import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getPlayer, upsertUser } from "./game/core";
import { getXUser } from "./session";

/** The signed-in player, fetched once per request (layout + page share it). Redirects if signed out. */
export const currentPlayer = cache(async () => {
  const x = await getXUser();
  if (!x) redirect("/?x=required");
  let p = await getPlayer(x.id);
  // Guest accounts carry everything needed to rebuild the player row (e.g. a fresh temporary
  // database on another server instance before a real DATABASE_URL is set). Recreate instead of
  // bouncing the visitor back to sign-in.
  if (!p && x.id.startsWith("guest-")) {
    await upsertUser({ id: x.id, username: x.username, name: x.name, avatar: x.avatar });
    p = await getPlayer(x.id);
  }
  if (!p) redirect("/api/x/login");
  return p;
});
