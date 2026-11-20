import { headers } from "next/headers";
import { ProfilePanel } from "@/components/game/ProfilePanel";
import { PageTitle } from "@/components/ui";
import { levelInfo } from "@/lib/game/level";
import { currentPlayer } from "@/lib/player";
import { activityFor } from "@/lib/game/profile";

export const metadata = { title: "Profile" };

export default async function Profile() {
  const [p, h] = await Promise.all([currentPlayer(), headers()]);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const lv = levelInfo(p.lifetimePoints);
  const history = await activityFor(p.id);
  return (
    <>
      <PageTitle kicker="Profile" title="Your profile" />
      <ProfilePanel
        d={{
          username: p.username,
          avatar: p.avatar,
          level: lv.level,
          title: lv.title,
          faction: p.faction,
          points: p.points,
          fragments: p.fragments,
          have: p.progress.have,
          need: p.progress.need,
          inventory: p.inventory,
          refLink: `${origin}/?ref=${p.refCode}`,
          refCode: p.refCode,
          recruits: p.referralsVerified,
          referred: p.referred,
          mail: p.mail,
          suspended: p.accountStatus !== "active",
          history,
        }}
      />
    </>
  );
}
