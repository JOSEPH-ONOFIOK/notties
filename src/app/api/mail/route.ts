import { handler, json } from "@/lib/api";
import { GameError } from "@/lib/db";
import { claimMail, listMail, mailCount, markMailRead } from "@/lib/game/mail";

export const GET = handler({ name: "mail" }, async (user) => ({ mail: await listMail(user.id), count: await mailCount(user.id) }));

export const POST = handler({ name: "mail", limit: [30, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "claim" | "claimAll" | "read"; id?: string }>(req);
  if (b.action === "read") {
    await markMailRead(user.id);
    return {};
  }
  if (b.action === "claim") {
    if (!b.id || !/^\d{1,18}$/.test(b.id)) throw new GameError("Bad letter");
    return { result: await claimMail(user.id, b.id) };
  }
  if (b.action === "claimAll") return { result: await claimMail(user.id) };
  throw new GameError("Unknown action");
});
