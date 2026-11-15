import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getPlayer } from "./game/core";
import { getXUser } from "./session";

/** The signed-in player, fetched once per request (layout + page share it). Redirects if signed out. */
export const currentPlayer = cache(async () => {
  const x = await getXUser();
  if (!x) redirect("/?x=required");
  const p = await getPlayer(x.id);
  if (!p) redirect("/api/x/login");
  return p;
});
