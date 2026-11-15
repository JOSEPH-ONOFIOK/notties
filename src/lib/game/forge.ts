import "server-only";
import { randomInt } from "node:crypto";
import { GameError, withTx } from "../db";
import { FRAGMENT_TYPES, type FragmentType } from "./config";
import { addFragment, addPoints, getInventory, getSettings, logRisk, recipeProgress, requireActive } from "./core";
import { pushFeed } from "./feed";

/**
 * Assemble a Nottie. Consumes one full recipe from the player's inventory, records the forge and
 * books one GTD mint allocation — all in one transaction, so a double-submit can't forge twice.
 */
export async function forgeNottie(userId: string, idemKey: string) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(idemKey)) throw new GameError("Bad request");

  return withTx(async (q) => {
    const settings = await getSettings(q);
    if (!settings.forge_enabled) throw new GameError("The Lab is closed right now.", 503);

    const u = await requireActive(q, userId);

    const already = (await q.query<{ id: string; created_at: string; nottie_seed: number }>("select id, created_at, nottie_seed from forge_completions where user_id = $1", [userId])).rows[0];
    if (already) {
      await logRisk(q, userId, "duplicate_forge", {}, 1);
      return { replayed: true, forgedAt: already.created_at, seed: already.nottie_seed };
    }

    // Lock every inventory row we're about to consume.
    await q.query("select 1 from inventory where user_id = $1 for update", [userId]);
    const inv = await getInventory(userId, q);
    const progress = recipeProgress(inv, settings.recipe);
    if (!progress.complete) {
      const missing = progress.slots.filter((s) => !s.done).map((s) => s.type);
      throw new GameError(`Still missing: ${missing.join(", ")}`);
    }

    const seed = randomInt(1, 1_000_000);
    const forge = (await q.query<{ id: string; created_at: string }>("insert into forge_completions (user_id, recipe, nottie_seed) values ($1,$2,$3) returning id, created_at", [userId, JSON.stringify(settings.recipe), seed])).rows[0];

    for (const t of FRAGMENT_TYPES as FragmentType[]) {
      const n = settings.recipe[t] ?? 0;
      if (n > 0) await addFragment(q, userId, t, -n, "forge", forge.id, `forge:${forge.id}:${t}`);
    }
    await q.query("insert into mint_eligibility (user_id, category, phase, allocation, status) values ($1,'forge',1,1,'approved') on conflict (user_id, category) do nothing", [userId]);
    await addPoints(q, userId, Number(settings.points.forge) || 0, "forge", forge.id, `forge:${forge.id}`);
    await pushFeed(q, userId, "forge", { seed });

    return { replayed: false, forgedAt: forge.created_at, seed, username: u.x_username };
  });
}
