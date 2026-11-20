import Image from "next/image";
import Link from "next/link";
import { TbArrowRight, TbStarFilled } from "react-icons/tb";
import { Countdown } from "@/components/Countdown";
import { FragmentIcon } from "@/components/FragmentIcon";
import { Coin } from "@/components/game/Coin";
import { NottieFigure } from "@/components/game/NottieFigure";
import { ProgressBar } from "@/components/ui";
import { BRAND, FRAGMENT_BY_TYPE, type FragmentType } from "@/lib/game/config";
import { levelInfo } from "@/lib/game/level";
import { listTasks } from "@/lib/game/tasks";
import { getSettings } from "@/lib/game/core";
import { FactionPicker } from "@/components/game/FactionPicker";
import { currentPlayer } from "@/lib/player";
import { EarnStrip } from "@/components/game/EarnStrip";

export const metadata = { title: "Robinhood City" };

type Objective = { title: string; body: string; href: string; cta: string; icons?: FragmentType[] };

export default async function City({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [p, sp] = await Promise.all([currentPlayer(), searchParams]);
  const [tasks, settings] = await Promise.all([listTasks(p.id), getSettings()]);
  const mintAt = settings.mint?.date && !Number.isNaN(Date.parse(settings.mint.date)) && new Date(settings.mint.date) > new Date() ? settings.mint.date : null;
  const openMissions = tasks.filter((t) => !t.completed).length;
  const lv = levelInfo(p.lifetimePoints);
  const missing = p.progress.slots.filter((s) => !s.done).map((s) => s.type);
  const spares = Object.values(p.inventory).reduce((a, n) => a + Math.max(0, n - 1), 0);
  const have = Object.fromEntries(p.progress.slots.map((s) => [s.type, p.forgedAt ? true : s.done])) as Record<FragmentType, boolean>;

  const objective: Objective =
    p.mail > 0
      ? { title: "You've got mail", body: `${p.mail} letter${p.mail === 1 ? "" : "s"} waiting. Your $NOTTIES rewards are inside.`, href: "/mail", cta: "Open mailbox" }
      : p.crates > 0
        ? { title: `Open ${p.crates} free crate${p.crates === 1 ? "" : "s"}`, body: "It's on the house. Crack it open and see what part falls out.", href: "/hunt", cta: "Go hunt" }
        : p.points >= settings.crate_price && !p.forgedAt && !p.progress.complete
          ? { title: "Buy a crate", body: `You've got ${p.points.toLocaleString()} $NOTTIES. A crate costs ${settings.crate_price}. Go see what's inside.`, href: "/hunt", cta: "Go hunt" }
        : p.claims === 0
      ? { title: "Crack your first crate", body: "A Portal Crate just washed up. Tap it open and see what falls out.", href: "/hunt", cta: "Go hunt" }
      : !p.onboarded
        ? { title: "Report for trouble", body: "Claim your onboarding bounty on the Mission Board. Easy $NOTTIES.", href: "/tasks", cta: "Open missions" }
        : p.forgedAt && !p.wallet
          ? { title: "Final step: your wallet", body: "Your Nottie is built. Follow, like and comment on our launch post, then submit your wallet to lock your free mint.", href: "/wallet", cta: "Finish up" }
          : p.forgedAt
            ? { title: "Recruit the crew", body: `You're one of us. Bring friends: each recruit who plays pays you ${settings.points.referral} $NOTTIES.`, href: "/referrals", cta: "Get your link" }
            : p.progress.complete
              ? { title: "Assemble your Nottie!", body: "Every part is on the bench. Fire up Vlad's machine.", href: "/forge", cta: "To the lab" }
              : {
                  title: `Find ${missing.length} more part${missing.length === 1 ? "" : "s"}`,
                  body: missing.length <= 3 ? `Still missing: ${missing.map((m) => FRAGMENT_BY_TYPE[m].name).join(", ")}. Hunt or trade for them.` : "Keep cracking crates. Trade spares on the Black Market.",
                  href: missing.length <= 2 ? "/trade?tab=swap" : "/hunt",
                  cta: missing.length <= 2 ? "Find a trade" : "Go hunt",
                  icons: missing,
                };

  return (
    <>
      {sp.welcome && (
        <div className="card card-lime mb-6 flex items-center gap-4 p-4 anim-pop">
          <Image src="/brand/logo.png" alt="" width={48} height={50} className="anim-float" />
          <div>
            <div className="display text-xl text-black">Welcome to Robinhood City, @{p.username}!</div>
            <div className="text-sm font-semibold text-black/70">Vlad&apos;s lab is leaking crates. Grab one, collect all 7 parts, and build your Nottie.</div>
          </div>
        </div>
      )}

      {mintAt && (
        <div className="card card-lime mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-black">
            <div className="display text-xs tracking-[0.25em] text-black/60">Mint opens</div>
            <Countdown until={mintAt} readyText="NOW" className="display text-3xl" plain />
          </div>
          <div className="text-right text-sm font-semibold text-black/70">
            {[settings.mint.chain, "Free mint"].filter(Boolean).join(" · ")}
            <div className="text-xs">{p.gtd ? "You're on the guaranteed list." : "Assemble your Nottie to lock a guaranteed spot."}</div>
          </div>
        </div>
      )}

      {!p.faction && p.claims > 0 && <FactionPicker />}

      {/* ── hero row: objective + your nottie ── */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card relative overflow-hidden p-6 sm:p-7">
          <div className="display inline-flex -rotate-2 items-center gap-1.5 rounded-md border-[3px] border-black bg-warn px-2 py-0.5 text-xs tracking-[0.2em] text-black shadow-[0_3px_0_#000]"><TbStarFilled size={12} /> Current objective</div>
          <h1 className="display ink-text mt-3 text-4xl leading-none text-white sm:text-5xl">{objective.title}</h1>
          <p className="mt-2 max-w-md text-muted">{objective.body}</p>
          {objective.icons && objective.icons.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {objective.icons.map((t) => (
                <li key={t} className="grid h-12 w-12 place-items-center rounded-xl border-[3px] border-black bg-black/50" title={FRAGMENT_BY_TYPE[t].name}>
                  <span style={{ filter: "brightness(0) invert(.35)" }}>
                    <FragmentIcon type={t} size={30} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href={objective.href} className="btn btn-accent btn-xl">
              {objective.cta} <TbArrowRight size={22} strokeWidth={2.8} />
            </Link>
            <Link href="/wiki" className="text-sm font-bold text-muted underline underline-offset-4 hover:text-accent">
              New here? How to play
            </Link>
          </div>
        </div>

        <Link href="/forge" className="card group relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-1">
          <div className="relative shrink-0">
            <NottieFigure have={have} size={120} seed={p.nottieSeed ?? undefined} charged={!!p.forgedAt} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="display text-xs tracking-widest text-muted">Your Nottie</div>
            <div className="display mt-1 text-2xl leading-tight">{p.forgedAt ? "One of us!" : `${p.progress.have}/${p.progress.need} parts`}</div>
            <ProgressBar pct={p.forgedAt ? 100 : p.progress.pct} className="mt-3" />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border-2 border-black bg-black/40 p-2">
                <div className="text-muted">Level {lv.level}</div>
                <div className="display text-accent">{lv.title}</div>
              </div>
              <div className="rounded-lg border-2 border-black bg-black/40 p-2">
                <div className="text-muted">$NOTTIES</div>
                <div className="display flex items-center gap-1 text-accent">
                  <Coin size={14} /> {p.points.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-6">
        <EarnStrip compact points={settings.points} streakTop={Math.max(...(settings.streak_bonus ?? [settings.points.daily_checkin]).map(Number))} referral={settings.points.referral} forge={settings.points.forge} cratePrice={settings.crate_price} />
      </div>

      {/* ── the city ── */}
      <div className="mt-8 mb-3 flex items-end justify-between">
        <h2 className="display ink-text text-3xl text-white sm:text-4xl">Robinhood City</h2>
        <span className="display text-xs tracking-widest text-muted">Pick a spot</span>
      </div>

      <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:gap-4 lg:grid-cols-4">
        <Spot href="/hunt" img="/brand/hero-img-night-v2.webp" name="Crate Drop" tag="Hunt" className="col-span-2 row-span-2" pos="center 55%" badge={p.crateAt === "need" ? `Crate: ${settings.crate_price} $NOTTIES` : <Countdown until={p.crateAt} readyText="READY!" className="display text-sm" plain />} hot={p.crateAt === null} big />
        <Spot href="/forge" img="/notties/221.webp" name="Vlad's Lab" tag="Forge" pos="center 30%" badge={p.forgedAt ? "Done" : `${p.progress.pct}%`} hot={p.progress.complete && !p.forgedAt} />
        <Spot href="/tasks" img="/characters/Hood.webp" name="Earn $NOTTIES" tag="Missions" pos="center 30%" badge={openMissions ? `${openMissions} to do` : "All done"} hot={openMissions > 0} />
        <Spot href="/trade" img="/notties/86.webp" name="The Market" pos="center 30%" tag="Shop & swap" badge="Buy parts" />
        <Spot href="/inventory" img="/notties/6.webp" name="Your Stash" tag="Cards" pos="center 30%" badge={`${spares} spare${spares === 1 ? "" : "s"}`} />
        <Spot href="/leaderboard" img="/characters/Dild.webp" name="Most Wanted" tag="Ranks" pos="center 30%" badge="Wanted" />
        <Spot href="/referrals" img="/characters/Woody.webp" name="Recruit Office" pos="center 30%" tag="Invite" badge={`${p.referralsVerified} recruits`} />
        <Spot href="/showroom" img="/notties/248.webp" name="The Gallery" tag="Showroom" className="col-span-2 lg:col-span-2" pos="center 35%" badge={`${BRAND.supply.toLocaleString()} Notties`} />
      </div>
    </>
  );
}

function Spot({ href, img, name, tag, badge, hot = false, big = false, className = "", pos = "center" }: { href: string; img: string; name: string; tag: string; badge?: React.ReactNode; hot?: boolean; big?: boolean; className?: string; pos?: string }) {
  return (
    <Link href={href} className={`card group relative overflow-hidden p-0 transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_0_#000] active:translate-y-1 active:shadow-[0_2px_0_#000] ${className}`}>
      <Image src={img} alt="" fill sizes={big ? "(max-width:1024px) 100vw, 50vw" : "(max-width:1024px) 50vw, 25vw"} className="object-cover transition duration-500 group-hover:scale-110" style={{ objectPosition: pos }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      {badge && (
        <div className={`absolute right-2 top-2 rounded-full border-[3px] border-black px-2.5 py-0.5 shadow-[0_3px_0_#000] ${hot ? "anim-glow bg-accent text-black" : "bg-black/80 text-white"}`}>
          <span className="display text-xs">{badge}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <div className="display text-[10px] tracking-[0.25em] text-accent">{tag}</div>
        <div className={`display ink-text leading-none text-white ${big ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"}`}>{name}</div>
        {big && <div className="mt-2 inline-flex items-center gap-1 rounded-full border-[3px] border-black bg-accent px-3 py-1 text-xs font-bold text-black shadow-[0_3px_0_#000] transition group-hover:translate-x-1">
            Enter <TbArrowRight size={14} strokeWidth={3} />
          </div>}
      </div>
    </Link>
  );
}
