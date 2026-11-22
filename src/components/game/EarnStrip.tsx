import Link from "next/link";
import type { IconType } from "react-icons";
import { TbCalendarCheck, TbClipboardCheck, TbFlask2, TbGift, TbUsers } from "react-icons/tb";
import { Coin } from "./Coin";

/** Every way to earn $NOTTIES, with what it pays and a button to go do it. */
export function EarnStrip({ points, streakTop, referral, forge, cratePrice, compact = false }: { points: { daily_checkin: number; daily_gift: number }; streakTop: number; referral: number; forge: number; cratePrice: number; compact?: boolean }) {
  const ways: { icon: IconType; title: string; pays: string; body: string; href: string; cta: string }[] = [
    { icon: TbClipboardCheck, title: "Missions", pays: "150 each", body: "Like, repost, comment, follow. Beat the timer for full pay.", href: "/tasks#round", cta: "Do missions" },
    { icon: TbCalendarCheck, title: "Daily check-in", pays: `${points.daily_checkin}–${streakTop}`, body: "Show up every day. Your streak makes it bigger.", href: "/tasks#daily", cta: "Check in" },
    { icon: TbGift, title: "Daily gift", pays: String(points.daily_gift), body: "Send a spare card to another player today.", href: "/trade?tab=gift", cta: "Gift a card" },
    { icon: TbUsers, title: "Invite friends", pays: `${referral} each`, body: "When a friend joins with your link and likes our free mint post.", href: "/profile", cta: "Get my link" },
    { icon: TbFlask2, title: "Build your Nottie", pays: String(forge), body: "Collect all 7 parts and assemble.", href: "/forge", cta: "To the lab" },
  ];
  return (
    <section className="card card-lime relative overflow-hidden p-4 text-black sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="display inline-flex items-center gap-2 text-2xl sm:text-3xl">
            <Coin size={30} /> Earn $NOTTIES
          </div>
          <p className="text-sm font-semibold text-black/70">Spend them on crates ({cratePrice} each) to unlock parts.</p>
        </div>
      </div>
      <ul className={`mt-4 grid gap-2 ${compact ? "grid-cols-2 lg:grid-cols-5 [&>li:last-child]:col-span-2 lg:[&>li:last-child]:col-span-1" : "sm:grid-cols-2 lg:grid-cols-5"}`}>
        {ways.map((w) => (
          <li key={w.title}>
            <Link href={w.href} className={`flex h-full flex-col rounded-xl border-[3px] p-3 text-white shadow-[0_4px_0_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 ${w.title === "Missions" ? "animate-pulse border-[#ffcc33] bg-gradient-to-br from-[#3a2a00] to-black shadow-[0_0_18px_rgba(255,204,51,.55)]" : "border-black bg-black"}`}>
              <div className="flex items-center justify-between gap-2">
                <w.icon size={22} className="text-accent" />
                <span className={`display flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-black ${w.title === "Missions" ? "bg-[#ffcc33]" : "bg-accent"}`}>
                  +{w.pays}
                </span>
              </div>
              <div className="display mt-2 text-lg leading-tight">{w.title}</div>
              {!compact && <div className="mt-0.5 flex-1 text-xs text-white/65">{w.body}</div>}
              <div className="display mt-2 text-xs text-accent">{w.cta} →</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
