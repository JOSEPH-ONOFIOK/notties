import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FragmentIcon } from "@/components/FragmentIcon";
import { RarityPill, XGlyph } from "@/components/ui";
import { TbArrowsExchange, TbBackpack, TbBox, TbExternalLink, TbFlask2 } from "react-icons/tb";
import { BRAND, FRAGMENTS, PARTS, ORIGINAL_FOUR, POINTS_NAME, TEASERS } from "@/lib/game/config";
import { stats } from "@/lib/game/leaderboard";
import { LiveBar } from "@/components/game/LiveBar";
import { eventTimeline } from "@/lib/game/events";
import { readFeed } from "@/lib/game/feed";
import { getXUser } from "@/lib/session";
import { getSettings } from "@/lib/game/core";
import { FreeMintCard } from "@/components/game/Promos";
import { guestMode } from "@/lib/guest";

export const dynamic = "force-dynamic";

const LOOP = [
  { n: "01", t: "Earn $NOTTIES", icon: TbBackpack, d: "Do missions, check in daily, gift cards and invite friends. Every one pays $NOTTIES, the in-game token." },
  { n: "02", t: "Open crates", icon: TbBox, d: "Your first crate is free. After that, spend $NOTTIES on crates any time, or buy parts in the Market. Each crate drops a random part." },
  { n: "03", t: "Trade", icon: TbArrowsExchange, d: "You'll get doubles. Swap them with other players for the parts you're missing. The Body and Hand & Head are the hardest to find." },
  { n: "04", t: "Assemble", icon: TbFlask2, d: "Collect all seven parts, build your Nottie, add your wallet. Your guaranteed free mint spot is locked." },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ x?: string; ref?: string }> }) {
  const sp = await searchParams;
  const x = await getXUser();
  if (x && !sp.x) redirect("/dashboard");
  const [s, timeline, feed] = await Promise.all([
    stats().catch(() => ({ players: 0, forged: 0, claims: 0, trades: 0 })),
    eventTimeline(),
    readFeed(0, 20),
  ]);
  const guest = guestMode();
  const login = guest ? `/enter${sp.ref ? `?ref=${encodeURIComponent(sp.ref)}` : ""}` : `/api/x/login${sp.ref ? `?ref=${encodeURIComponent(sp.ref)}` : ""}`;
  const cta = guest ? "Enter the Lab" : "Sign in with X";

  const notice =
    sp.x === "required" ? (guest ? "Pick a name to enter the Lab." : "Sign in with X to enter the Lab.") : sp.x === "cancelled" ? "Sign-in cancelled. The portal's still open." : sp.x === "failed" ? "X sign-in failed. Try again." : sp.x === "unavailable" ? "X sign-in isn't configured on this deployment yet." : null;

  return (
    <main className="relative overflow-x-clip">
      <div className="relative z-20">
        <LiveBar initial={timeline} feed={feed} />
      </div>
      {/* ── hero ── */}
      <section className="relative isolate min-h-[92dvh]">
        <Image src="/brand/hero-img-night-v2.webp" alt="" fill priority className="object-cover object-center opacity-95" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/25 to-bg" />
        <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-bg/80 via-bg/30 to-transparent lg:w-3/4" />
        <div className="scanlines absolute inset-0" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/brand/logo.png" alt="The Notties" width={44} height={46} className="anim-float" />
            <span className="display text-xl tracking-wide">The Lab</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <a href={BRAND.site} target="_blank" rel="noreferrer" className="btn btn-ghost hidden md:inline-flex">
              thenotties.xyz <TbExternalLink size={15} />
            </a>
            <Link href="/wiki" className="btn btn-ghost hidden sm:inline-flex">
              Field Guide
            </Link>
            <Link href={login} className="btn btn-accent">
              {cta}
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start px-4 pb-24 pt-10 sm:pt-20">
          {notice && <div className="mb-6 rounded-full border border-warn/40 bg-[#2e2600] px-4 py-2 text-sm text-warn">{notice}</div>}
          {sp.ref && !notice && <div className="mb-6 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm text-accent">A troublemaker sent you. Sign in and the referral sticks.</div>}
          <div className="flex flex-wrap items-center gap-3">
            <span className="display -rotate-2 rounded-md border-[3px] border-black bg-accent px-2.5 py-0.5 text-sm tracking-widest text-black shadow-[0_3px_0_#000]">Free mint</span>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Pre-mint progression · {BRAND.city}</span>
          </div>
          <h1 className="display mt-4 max-w-3xl text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">
            Vlad&apos;s lab <span className="goo-text">is leaking.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-text/90 sm:text-lg">
            Earn <b className="text-accent">$NOTTIES</b> from missions, spend them on crates, trade your doubles and collect all seven parts. Finish the set and your guaranteed spot in the <b className="text-accent">free mint</b> is locked.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={login} className="btn btn-accent anim-glow text-base">
              {!guest && <XGlyph />} {cta} &amp; start hunting
            </Link>
            <Link href="/wiki" className="btn btn-ghost">
              How to play
            </Link>
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-x-10 gap-y-4 text-sm sm:grid-cols-4">
            <Counter k="Troublemakers" v={s.players} />
            <Counter k="Crates cracked" v={s.claims} />
            <Counter k="Fragments traded" v={s.trades} />
            <Counter k="Notties assembled" v={s.forged} />
          </dl>
        </div>
      </section>

      {/* ── marquee ── */}
      <div className="border-y border-border bg-accent py-2 text-bg">
        <div className="flex overflow-hidden whitespace-nowrap">
          <div className="anim-marquee flex shrink-0 gap-10 pr-10 display text-sm tracking-widest">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="flex gap-10">
                <span>Free mint</span>
                <span>Hunt · Collect · Trade · Assemble</span>
                <span>Earn $NOTTIES · Buy crates · Trade</span>
                <span>5,760 coming through the portal</span>
                <span>Come cause trouble with us</span>
                <span>Earn {POINTS_NAME}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── loop ── */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-accent">The loop</div>
        <h2 className="display mt-2 text-4xl sm:text-5xl">Something to do before mint.</h2>
        <Link href="/wiki" className="mt-3 inline-block text-sm font-bold text-accent underline underline-offset-4">Read the full field guide</Link>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((l) => (
            <div key={l.n} className="card relative overflow-hidden p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl border-[3px] border-black bg-accent text-black shadow-[0_3px_0_#000]">
                  <l.icon size={22} strokeWidth={2.4} />
                </span>
                <span className="display text-3xl text-white/15">{l.n}</span>
              </div>
              <div className="display mt-2 text-2xl">{l.t}</div>
              <p className="mt-2 text-sm text-muted">{l.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── fragments ── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-accent">The recipe</div>
            <h2 className="display mt-2 text-4xl sm:text-5xl">Seven parts. One Nottie.</h2>
            <p className="mt-3 max-w-lg text-muted">Every crate drops exactly one. Rarity decides how long you&apos;ll be hunting, and duplicates are for trading.</p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {PARTS.map((f) => (
                <li key={f.type} className="card flex items-center gap-3 p-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-raised">
                    <FragmentIcon type={f.type} size={40} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold">{f.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <RarityPill rarity={f.rarity} />
                      <span className="text-xs text-muted">{f.weight}%</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              {TEASERS.slice(0, 4).map((src, i) => (
                <div key={src} className={`card relative aspect-square overflow-hidden ${i % 2 ? "translate-y-6 rotate-2" : "-rotate-2"}`}>
                  <Image src={src} alt="A Nottie, unrevealed" fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover" />
                </div>
              ))}
            </div>
            <div className="stamp absolute -left-3 top-6 text-2xl">Escaped</div>
          </div>
        </div>
      </section>

      {/* ── the prizes ── */}
      <section id="prizes" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-accent">What you&apos;re playing for</div>
        <h2 className="display mt-2 text-4xl sm:text-5xl">A free mint. Guaranteed.</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <FreeMintCard cta={{ href: login, label: "Lock my free spot" }} />
          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-warn px-2 py-0.5 text-xs tracking-[0.2em] text-black">Earn $NOTTIES</div>
            <h3 className="display mt-4 text-4xl leading-[0.9] sm:text-5xl">Missions pay $NOTTIES.</h3>
            <p className="mt-3 max-w-md text-sm text-muted">New missions drop all the time. Do them before the timer runs out for the full reward. Every one sends $NOTTIES to your mailbox. Spend them on crates, collect your parts, and trade for the rest.</p>
            <ul className="mt-5 grid gap-2 text-sm font-bold">
              {["Earn $NOTTIES from your missions", "Spend them on crates to unlock parts", "Collect the full set (crates + trading), then add your wallet"].map((t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="display grid h-6 w-6 shrink-0 place-items-center rounded-full border-[3px] border-black bg-warn text-xs text-black">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── original four ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-accent">The original four</div>
        <h2 className="display mt-2 text-4xl sm:text-5xl">Meet the troublemakers.</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ORIGINAL_FOUR.map((c, i) => (
            <figure key={c.name} className="card group overflow-hidden">
              <div className="relative aspect-square overflow-hidden bg-raised">
                <Image src={c.img} alt={c.name} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <figcaption className="p-4">
                <div className="text-[11px] font-bold tracking-widest text-muted">0{i + 1}/04</div>
                <div className="display text-2xl">{c.name}</div>
                <div className="text-sm text-muted">{c.line}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24">
        <div className="card relative overflow-hidden p-8 sm:p-14">
          <Image src="/brand/hero-img-day-v2.webp" alt="" fill className="object-cover opacity-20" sizes="100vw" />
          <div className="relative">
            <h2 className="display text-4xl sm:text-6xl">
              Come cause <span className="goo-text">trouble</span> with us.
            </h2>
            <p className="mt-3 max-w-lg text-muted">Get in, crack your first crate, and the timer starts. Your Nottie is somewhere under Vlad&apos;s house. Go get it.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={login} className="btn btn-accent">
                {!guest && <XGlyph />} {cta}
              </Link>
              <a href={BRAND.x} target="_blank" rel="noreferrer" className="btn btn-ghost">
                Follow {BRAND.xHandle}
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} The Notties. All rights reserved. Made in Robinhood City. ·{" "}
        <a className="font-bold text-accent hover:underline" href={BRAND.site} target="_blank" rel="noreferrer">
          Visit the main site: thenotties.xyz
        </a>
      </footer>
    </main>
  );
}

function Counter({ k, v }: { k: string; v: number }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">{k}</dt>
      <dd className="display text-3xl goo-text">{v.toLocaleString()}</dd>
    </div>
  );
}
