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
        <NumberField k="crate_price" label="Crate price ($NOTTIES)" value={s.crate_price} hint="What a bought crate costs. It's where players spend their $NOTTIES." min={0} />
        <NumberField k="crate_buy_cooldown_minutes" label="Minutes between bought crates" value={s.crate_buy_cooldown_minutes} hint="60 = a player can buy one crate per hour." min={0} />
        <NumberField k="crate_buys_per_day" label="Bought crates per day (max)" value={s.crate_buys_per_day} hint="Per player, resets at midnight UTC. 0 turns buying off." min={0} />
        <TextSetting k="streak_bonus" label="Roll call streak rewards" value={(s.streak_bonus ?? []).join(", ")} hint="$NOTTIES for day 1, 2, 3… of a streak. After the last number it keeps paying that." parse="numbers" />
        <NumberField k="late_reward_pct" label="Late mission reward (%)" value={s.late_reward_pct} hint="What a mission pays after its deadline. 50 = half (100 becomes 50)." min={0} />
        <NumberField k="late_window_hours" label="Late window (hours)" value={s.late_window_hours} hint="How long a mission stays up after its deadline at the late reward. Then it disappears." min={0} />
        <NumberField k="welcome_crates" label="Welcome gift (free crates)" value={s.welcome_crates} hint="Sent to every new player's mailbox when they sign up. 0 = none." min={0} />
        <NumberField k="referral_crates" label="Recruit bonus (free crates)" value={s.referral_crates} hint="Sent to the recruiter's mailbox, with the $NOTTIES bonus, when a recruit plays." min={0} />
        <NumberField k="referral_qualify_claims" label="Referral qualifies after N crates" value={s.referral_qualify_claims} hint="The recruit must open this many crates before the recruiter is paid." min={1} />
        <TextSetting k="wallet_tasks" label="Missions before wallet" value={s.wallet_tasks.join(", ")} hint="Mission ids a player must finish (after building their Nottie) before they can submit a wallet. Default: follow_x, like_post, comment_post. Set the like/comment missions' link to your launch post on the Missions page." parse="list" />
        <TextSetting k="referral_task" label="Recruit mission (optional)" value={s.referral_task} hint="A mission id (from the Missions page) the recruit must also finish before the recruiter is paid, e.g. your launch-post mission. Leave blank to skip." parse="text" />
      </div>
      <div className="mt-4">
        <MintSetting value={s.mint ?? { date: "", chain: "", price: "" }} />
      </div>
      <div className="mt-4 grid gap-4">
        <MapField k="drop_weights" label="Crate drop weights" value={s.drop_weights} labels={labels} hint="Relative weights; percentages are computed from the total. Set 0 to stop a fragment dropping." />
        <MapField k="market_prices" label={`Marketplace prices (${POINTS_NAME})`} value={Object.fromEntries(Object.entries(s.market_prices).filter(([k]) => k !== "book"))} labels={labels} hint="What each part costs to buy outright. 0 = not for sale." />
        <MapField k="recipe" label="Forge recipe" value={s.recipe} labels={labels} hint="How many of each fragment one Nottie needs. Changing this after launch changes everyone's progress. Announce it first." />
        <MapField
          k="points"
          label={`${POINTS_NAME} rewards`}
          value={s.points}
          labels={{ crate: "Per free crate", onboarding: "Onboarding mission", follow_x: "Follow X mission", link_wallet: "Add wallet mission", daily_checkin: "Daily roll call (first day; the streak list above overrides)", daily_gift: "Daily gift", first_trade: "First trade", referral: "Verified recruit", forge: "Assembling a Nottie" }}
        />
      </div>
    </>
  );
}
