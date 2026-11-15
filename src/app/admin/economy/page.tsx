import { PageTitle } from "@/components/ui";
import { FRAGMENTS, POINTS_NAME } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { MapField, NumberField } from "@/components/admin/Controls";
import { MintSetting, TextSetting } from "@/components/admin/More";

export default async function Economy() {
  const s = await getSettings();
  const labels = Object.fromEntries(FRAGMENTS.map((f) => [f.type, f.name]));
  return (
    <>
      <PageTitle kicker="Admin" title="Economy" sub="Every number here takes effect on the next request. Changes are logged to admin_actions." />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField k="crate_cooldown_minutes" label="Crate cooldown (minutes)" value={s.crate_cooldown_minutes} hint="120 = one crate every 2 hours. Applies to claims made after the change." min={1} />
        <NumberField k="pity_threshold" label="Lucky meter size" value={s.pity_threshold} hint="Crates without a Rare+ before the next one is guaranteed Rare or better." min={2} />
        <NumberField k="crate_price" label="Bonus crate price (TROUBLE)" value={s.crate_price} hint="What a shop crate costs. It's the main TROUBLE sink." min={0} />
        <NumberField k="crate_buys_per_day" label="Bonus crates per day" value={s.crate_buys_per_day} hint="Per player, resets at midnight UTC. 0 turns the shop off." min={0} />
        <TextSetting k="streak_bonus" label="Roll call streak rewards" value={(s.streak_bonus ?? []).join(", ")} hint="TROUBLE for day 1, 2, 3… of a streak. After the last number it keeps paying that." parse="numbers" />
        <NumberField k="referral_qualify_claims" label="Referral qualifies after N crates" value={s.referral_qualify_claims} hint="The referee must open this many crates before the referrer is paid." min={1} />
      </div>
      <div className="mt-4">
        <MintSetting value={s.mint ?? { date: "", chain: "", price: "" }} />
      </div>
      <div className="mt-4 grid gap-4">
        <MapField k="drop_weights" label="Crate drop weights" value={s.drop_weights} labels={labels} hint="Relative weights; percentages are computed from the total. Set 0 to stop a fragment dropping." />
        <MapField k="pawn_prices" label={`Pawn Shop buyback (${POINTS_NAME})`} value={s.pawn_prices} labels={labels} hint="What the shop pays per spare fragment. Players always keep one of each." />
        <MapField k="recipe" label="Forge recipe" value={s.recipe} labels={labels} hint="How many of each fragment one Nottie needs. Changing this after launch changes everyone's progress. Announce it first." />
        <MapField
          k="points"
          label={`${POINTS_NAME} rewards`}
          value={s.points}
          labels={{ crate: "Per crate", onboarding: "Onboarding task", follow_x: "Follow X task", link_wallet: "Link wallet task", daily_checkin: "Daily roll call", referral: "Verified referral", forge: "Assembling a Nottie" }}
        />
      </div>
    </>
  );
}
