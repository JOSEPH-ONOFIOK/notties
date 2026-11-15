import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FragmentIcon } from "@/components/FragmentIcon";
import { RarityPill, XGlyph } from "@/components/ui";
import { TbArrowsExchange, TbBackpack, TbBox, TbFlask2 } from "react-icons/tb";
import { BRAND, FRAGMENTS, ORIGINAL_FOUR, POINTS_NAME, TEASERS } from "@/lib/game/config";
import { stats } from "@/lib/game/leaderboard";
import { LiveBar } from "@/components/game/LiveBar";
import { eventTimeline } from "@/lib/game/events";
import { readFeed } from "@/lib/game/feed";
import { getXUser } from "@/lib/session";
import { guestMode } from "@/lib/guest";

export const dynamic = "force-dynamic";

const LOOP = [
  { n: "01", t: "Hunt", icon: TbBox, d: "A Portal Crate washes up every 2 hours with one random part inside. Usually goggles. Sometimes a shard." },
  { n: "02", t: "Collect", icon: TbBackpack, d: "There are eight parts and you need one of each. The Portal Shard drops 3% of the time." },
  { n: "03", t: "Trade", icon: TbArrowsExchange, d: "Three pairs of boots and no gloves? Send your spares to someone who needs them, or pawn them for TROUBLE." },
  { n: "04", t: "Assemble", icon: TbFlask2, d: "Bring the full set to Vlad's lab and it builds your Nottie. That locks your guaranteed mint spot." },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ x?: string; ref?: string }> }) {
  const sp = await searchParams;
  const x = await getXUser();
  if (x && !sp.x) redirect("/dashboard");
  const [s, timeline, feed] = await Promise.all([stats().catch(() => ({ players: 0, forged: 0, claims: 0, trades: 0 })), eventTimeline(), readFeed(0, 20)]);
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
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Pre-mint progression · {BRAND.city}</div>
          <h1 className="display mt-4 max-w-3xl text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">
            Vlad&apos;s lab <span className="goo-text">is leaking.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-text/90 sm:text-lg">
            Portal Crates are washing up all over the city. Crack them, collect the fragments, trade with other troublemakers, and assemble your own Nottie. Finish the set and your guaranteed mint spot is locked.
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
                <span>Hunt · Collect · Trade · Assemble</span>
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
            <h2 className="display mt-2 text-4xl sm:text-5xl">Eight fragments. One Nottie.</h2>
            <p className="mt-3 max-w-lg text-muted">Every crate drops exactly one. Rarity decides how long you&apos;ll be hunting, and duplicates can be traded or pawned.</p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {FRAGMENTS.map((f) => (
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
        <a className="hover:text-accent" href={BRAND.site} target="_blank" rel="noreferrer">
          thenotties.xyz
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
