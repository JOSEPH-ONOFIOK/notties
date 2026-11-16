import { CrateClaim } from "@/components/CrateClaim";
import { FragmentCard } from "@/components/game/FragmentCard";
import { PageTitle } from "@/components/ui";
import { FRAGMENTS, PARTS } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { effectiveWeights, recentClaims, shopStatus } from "@/lib/game/hunt";
import { activeEffects } from "@/lib/game/events";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Hunt" };

export default async function Hunt() {
  const p = await currentPlayer();
  const [settings, claims, fx] = await Promise.all([getSettings(), recentClaims(p.id, 8), activeEffects()]);
  const shop = await shopStatus(p.id, settings);
  const weights = effectiveWeights(settings, fx.drop);
  const total = Object.values(weights).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
  const cooldown = Math.round(settings.crate_cooldown_minutes * fx.cooldown);
  const hours = cooldown / 60;

  return (
    <>
      <PageTitle kicker="Hunt" title="Raid the lab" sub={`A Portal Crate washes up every ${hours === 1 ? "hour" : Number.isInteger(hours) ? `${hours} hours` : `${cooldown} minutes`}. Tap it open. One fragment inside, +${settings.points.crate} TROUBLE. Vlad's clock runs the timer, so no cheating.`} />

      <CrateClaim nextClaimAt={p.nextClaimAt} enabled={settings.claims_enabled} suspended={p.accountStatus !== "active"} cooldownMinutes={cooldown} pity={p.pity} pityThreshold={Math.max(2, Number(settings.pity_threshold) || 10)} shop={shop} points={p.points} eventName={fx.names.join(" + ") || null} />

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="display ink-text text-3xl text-white">Drop odds</h2>
          <span className="text-xs text-muted">Live. What you see is what the server rolls.</span>
        </div>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {PARTS.map((f) => {
            const pct = Math.round(((Number(weights[f.type]) || 0) / total) * 1000) / 10;
            const boosted = (fx.drop[f.type] ?? 1) > 1;
            return (
              <li key={f.type} className="flex flex-col items-center gap-2">
                <FragmentCard type={f.type} size="sm" locked={p.inventory[f.type] === 0 && !p.forgedAt} />
                <span className={`display rounded-full border-2 border-black px-2 text-xs ${boosted ? "bg-warn text-black" : "bg-black/60 text-accent"}`}>
                  {pct}%{boosted ? ` ×${fx.drop[f.type]}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Greyed-out cards are ones you haven&apos;t found yet.</p>
      </section>

      <section className="mt-8">
        <h2 className="display ink-text mb-3 text-3xl text-white">Your haul</h2>
        {claims.length === 0 ? (
          <div className="card p-6 text-center text-muted">Nothing yet. That crate isn&apos;t going to crack itself.</div>
        ) : (
          <ul className="flex gap-3 overflow-x-auto pb-3">
            {claims.map((c, i) => (
              <li key={i} className="w-24 shrink-0 sm:w-28">
                <FragmentCard type={c.type} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
