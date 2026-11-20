import Image from "next/image";
import Link from "next/link";
import { TbArrowRight, TbPlus, TbShieldCheck } from "react-icons/tb";
import { FragmentCard } from "@/components/game/FragmentCard";
import { Coin } from "@/components/game/Coin";
import { NottieFigure } from "@/components/game/NottieFigure";
import { ReplayIntro } from "@/components/game/IntroStory";
import { BRAND, FRAGMENTS, PARTS, ORIGINAL_FOUR, POINTS_NAME, RARITY_COLOR, RARITY_LABEL } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { titleFor } from "@/lib/game/level";
import { FACTIONS } from "@/lib/game/config";
import { eventTimeline } from "@/lib/game/events";
import { guestMode } from "@/lib/guest";
import { getXUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Field Guide", description: "How to play The Notties: crack crates, collect 8 parts, build your Nottie, lock your GTD spot." };

const CHAPTERS = [
  ["story", "The story so far"],
  ["quick", "The 30-second version"],
  ["crates", "Crates"],
  ["cards", "The 8 parts"],
  ["lab", "Vlad's Lab"],
  ["trade", "Black Market & swaps"],
  ["missions", "Missions & mailbox"],
  ["trouble", "$NOTTIES & levels"],
  ["streaks", "Streaks & the lucky meter"],
  ["shop", "Buying crates"],
  ["events", "Live events"],
  ["gangs", "Gangs"],
  ["recruit", "Recruiting"],
  ["wanted", "Most Wanted"],
  ["rules", "House rules"],
  ["faq", "FAQ"],
] as const;

export default async function Wiki() {
  const [s, x, tl] = await Promise.all([getSettings(), getXUser(), eventTimeline()]);
  const DAYN = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const total = Object.values(s.drop_weights).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
  const hours = s.crate_cooldown_minutes / 60;
  const every = hours === 1 ? "every hour" : Number.isInteger(hours) ? `every ${hours} hours` : `every ${s.crate_cooldown_minutes} minutes`;
  const enter = x ? "/dashboard" : guestMode() ? "/enter" : "/api/x/login";
  const levels = [1, 2, 3, 5, 8, 12, 16].map((n) => ({ n, xp: 25 * n * (n - 1), title: titleFor(n) }));
  const P = s.points;

  return (
    <div className="min-h-dvh">
      {/* header */}
      <header className="sticky top-0 z-40 border-b-[3px] border-black bg-[#151910]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="The Notties" width={36} height={37} />
            <span className="display text-lg">Field Guide</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href={enter} className="btn btn-accent !min-h-[42px] !px-4 text-sm">
              {x ? "Back to the city" : "Start playing"}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        {/* chapters */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 card p-4">
            <div className="display mb-2 text-xs tracking-widest text-muted">Chapters</div>
            <ol className="space-y-1 text-sm">
              {CHAPTERS.map(([id, label], i) => (
                <li key={id}>
                  <a href={`#${id}`} className="flex gap-2 rounded-lg px-2 py-1 hover:bg-raised hover:text-accent">
                    <span className="display w-5 text-muted">{i + 1}</span>
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <main className="min-w-0 space-y-10">
          {/* cover */}
          <section className="card card-lime relative overflow-hidden p-6 sm:p-10">
            <div className="beams" style={{ ["--beam" as string]: "#ffffff", opacity: 0.3 }} />
            <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
              <div className="text-black">
                <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-black px-2 py-0.5 text-xs tracking-[0.2em] text-accent">Vlad&apos;s notebook · property of Vlad · DO NOT READ</div>
                <h1 className="display mt-3 text-5xl leading-[0.9] sm:text-7xl">The Notties field guide</h1>
                <p className="mt-3 max-w-lg font-semibold text-black/75">Everything you need to cause the right kind of trouble. Five-minute read. Fewer if you skip my excellent jokes.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={enter} className="btn btn-ghost">
                    {x ? "Back to the city" : "Start playing"} <TbArrowRight size={18} strokeWidth={2.8} />
                  </Link>
                  {x && <ReplayIntro />}
                </div>
              </div>
              <div className="mx-auto">
                <NottieFigure have={{ background: true, shadow: true, body: true, shoes: true, outfit: true, mouth: true, eyes: true, gear: true }} size={170} className="anim-float" />
              </div>
            </div>
          </section>

          <Chapter id="story" n={1} title="The story so far">
            <p>
              Under {BRAND.city} there&apos;s a lab. In the lab there was a scientist (me, Vlad) and a very strange green energy from Sherwood Forest. Then there was a <b>BOOM</b>. A portal tore open and <b>{BRAND.supply.toLocaleString()} little green troublemakers</b> fell out. The first four escaped before I could even find my glasses:
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ORIGINAL_FOUR.map((c) => (
                <li key={c.name} className="card overflow-hidden">
                  <div className="relative aspect-square bg-raised">
                    <Image src={c.img} alt={c.name} fill sizes="200px" className="object-cover" />
                  </div>
                  <div className="p-2">
                    <div className="display">{c.name}</div>
                    <div className="text-xs text-muted">{c.line}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4">The rest are still in my basement, in pieces. Parts keep leaking out in crates. <b>Your job:</b> grab the parts, build a Nottie, and become one of us before the collection opens.</p>
          </Chapter>

          <Chapter id="quick" n={2} title="The 30-second version">
            <ol className="grid gap-3 sm:grid-cols-5">
              {[
                ["1", "Earn", `Do missions, check in, gift cards, recruit friends. All pay ${POINTS_NAME}.`],
                ["2", "Open crates", `Spend ${POINTS_NAME} on crates, plus a free one ${every}.`],
                ["3", "Trade", "Swap your doubles for the parts you're missing."],
                ["4", "Assemble", "All 8 parts? Build your Nottie."],
                ["5", "Add wallet", "Your guaranteed free mint spot is locked."],
              ].map(([n, t, d]) => (
                <li key={n} className="card p-4">
                  <div className="display grid h-9 w-9 place-items-center rounded-full border-[3px] border-black bg-accent text-black">{n}</div>
                  <div className="display mt-2 text-xl">{t}</div>
                  <div className="text-sm text-muted">{d}</div>
                </li>
              ))}
            </ol>
            <Tip>{POINTS_NAME} is the in-game token. The more you show up, the more crates you can open.</Tip>
          </Chapter>

          <Chapter id="crates" n={3} title="Crates">
            <p>
              Two ways to get a crate on the <b>Hunt</b> page: a <b>free one {every}</b>, or <b>buy one for {s.crate_price} {POINTS_NAME}</b> (one per hour). Missions and recruits also send free crates to your mailbox. <b>Tap a crate three times</b> to crack it open. Inside: exactly one part.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
              <li>The timer runs on my clock, not yours. Changing your phone&apos;s time won&apos;t help. I checked.</li>
              <li>What&apos;s inside is decided by the server the moment you tap. Tapping faster doesn&apos;t change it. Neither does refreshing.</li>
              <li>Timers don&apos;t stack. Come back when it&apos;s ready or you&apos;re leaving crates on the table.</li>
            </ul>
            <h3 className="display mt-6 text-xl">Drop odds (live)</h3>
            <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">
              {PARTS.map((f) => (
                <li key={f.type} className="flex flex-col items-center gap-1.5">
                  <FragmentCard type={f.type} size="sm" />
                  <span className="display rounded-full border-2 border-black bg-black/60 px-2 text-xs text-accent">{Math.round(((Number(s.drop_weights[f.type]) || 0) / total) * 1000) / 10}%</span>
                </li>
              ))}
            </ul>
          </Chapter>

          <Chapter id="cards" n={4} title="The 8 parts">
            <p>Every part is a collectible card. The frame colour tells you how rare it is.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["common", "uncommon", "rare", "epic", "legendary"] as const).map((r) => (
                <span key={r} className="display rounded-full border-2 border-black px-2.5 py-0.5 text-xs text-black" style={{ background: RARITY_COLOR[r] }}>
                  {RARITY_LABEL[r]}
                </span>
              ))}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {PARTS.map((f) => (
                <li key={f.type}>
                  <FragmentCard type={f.type} blurb />
                </li>
              ))}
            </ul>
            <Tip>The Body is the hard one: {Math.round(((Number(s.drop_weights.body) || 0) / total) * 1000) / 10}% per crate. Plenty of players trade for it instead of waiting.</Tip>
          </Chapter>

          <Chapter id="lab" n={5} title="Vlad's Lab (the Forge)">
            <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
              <div>
                <p>Open <b>Forge</b> and you&apos;ll see your Nottie standing on my lab pad. Every part you own shows up on it in full colour; missing parts are dark shadows. When all 8 are lit:</p>
                <ol className="mt-3 list-decimal space-y-1 pl-5">
                  <li>
                    Hit <b>Assemble!</b> and confirm.
                  </li>
                  <li>One of each part goes into the machine. Spares stay in your stash.</li>
                  <li>
                    Lightning. Flash. <b>APPROVED.</b> You&apos;re officially <b>One of Us</b>.
                  </li>
                  <li>
                    Your <b>guaranteed (GTD) mint spot</b> is booked and you get <b>+{P.forge} {POINTS_NAME}</b>.
                  </li>
                </ol>
                <Tip>You can only assemble once per account, and it can&apos;t be undone. After that, link a getaway wallet so I know where to deliver your Nottie.</Tip>
              </div>
              <NottieFigure have={{ background: true, shadow: true, body: true, shoes: true }} size={150} />
            </div>
          </Chapter>

          <Chapter id="trade" n={6} title="Black Market (swaps & gifts)">
            <p>Got three shadows and no shoes? Somebody out there has the opposite problem. Open <b>Trade</b> and you&apos;ve got two options:</p>
            <ul className="mt-3 space-y-2">
              <li>
                <b>Swap board.</b> Post an offer like &quot;my 1 Shadow for 1 Shoes&quot;. Your card is held safely until someone with Shoes takes the deal, then both sides swap at the same instant. Nobody can run off with your card. Cancel any time to get it back. You can even reserve an offer for one friend.
              </li>
              <li>
                <b>Gift a card.</b> Send a card straight to someone by X username or player code. It&apos;s instant and there&apos;s no undo, so double-check the name.
              </li>
            </ul>
            <p className="mt-3 text-muted">Every swap and gift is logged on both sides. I can see them all. I see everything.</p>
          </Chapter>

          <Chapter id="missions" n={7} title="Missions & mailbox">
            <p>
              Jobs are pinned up on the <b>Mission Board</b>. Each one pays {POINTS_NAME} <b>and free crates</b>. Fresh missions drop twice a day, at the start of each round, and disappear when the round ends. A timer on the board shows how long is left.
            </p>
            <p className="mt-3">
              Rewards go to your <b>mailbox</b>, the envelope at the top of the screen. A red number means something is waiting. Open it, tap <b>Claim</b>, then open your free crates on the <b>Hunt</b> page. Cards friends send you and finished swaps show up there too.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                <b>Missions</b> pay once.
              </li>
              <li>
                <b>Daily jobs</b> (like roll call, +{P.daily_checkin}) reset at midnight UTC.
              </li>
              <li>
                Missions with a link need you to actually <b>open it first</b>. Claiming two seconds later looks a lot like a robot.
              </li>
            </ul>
          </Chapter>

          <Chapter id="trouble" n={8} title={`${POINTS_NAME} & levels`}>
            <p>
              <b>{POINTS_NAME}</b> is the in-game token. Spend it on crates. You earn it by playing (round missions pay whatever the board says):
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ["Cracking a free crate", P.crate],
                ["Daily roll call (climbs with your streak)", P.daily_checkin],
                ["Daily gift (send a card to someone)", P.daily_gift],
                ["Your first trade", P.first_trade],
                ["Onboarding mission", P.onboarding],
                ["Following on X", P.follow_x],
                ["Linking a wallet", P.link_wallet],
                ["A recruit who plays", P.referral],
                ["Assembling your Nottie", P.forge],
              ].map(([k, v]) => (
                <li key={k as string} className="flex items-center justify-between rounded-xl border-[3px] border-black bg-raised px-3 py-2">
                  <span>{k}</span>
                  <span className="display flex items-center gap-1 text-accent">
                    <Coin size={16} /> +{v}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5">
              Everything you&apos;ve ever earned counts as XP, even what you spend, and XP sets your <b>level</b>:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {levels.map((l) => (
                <li key={l.n} className="rounded-xl border-[3px] border-black bg-raised px-3 py-2 text-sm">
                  <span className="display text-accent">Lv {l.n}</span> <span className="display">{l.title}</span> <span className="text-xs text-muted">· {l.xp} XP</span>
                </li>
              ))}
            </ul>
            <Tip>{POINTS_NAME} is an in-game score. It isn&apos;t money and it has no promised value. Anything it&apos;s used for later will be announced officially, with the rules, before it happens.</Tip>
          </Chapter>

          <Chapter id="streaks" n={9} title="Streaks & the lucky meter">
            <p>
              <b>Roll call streak.</b> Claim the daily roll call on consecutive days (UTC) and the reward climbs:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {(s.streak_bonus ?? []).map((v, i) => (
                <li key={i} className="rounded-xl border-[3px] border-black bg-raised px-3 py-1.5 text-sm">
                  <span className="text-muted">Day {i + 1}</span> <b className="text-accent">+{v}</b>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted">After that it keeps paying the top amount. Miss a day and you start again at day 1. The flame in the top bar shows your streak.</p>
            <p className="mt-5">
              <b>Lucky meter.</b> Every crate without a Rare or better fills one notch. When it&apos;s full ({s.pity_threshold} crates), your next crate is <b>guaranteed Rare or better</b>. Any Rare+ pull resets it.
            </p>
          </Chapter>

          <Chapter id="shop" n={10} title="Buying crates">
            <p>
              Spend <b>{s.crate_price} {POINTS_NAME}</b> on a crate, once every <b>{s.crate_buy_cooldown_minutes} minutes</b>. It cracks just like a free crate, fills your lucky meter, and doesn&apos;t touch your free-crate timer.
            </p>
          </Chapter>

          <Chapter id="events" n={11} title="Live events">
            <p>Some days the lab gets weird. Events turn on and off by themselves on the server clock, so everyone gets them at exactly the same moment. Look for the banner under the top bar.</p>
            <ul className="mt-3 space-y-2">
              {(s.recurring_events ?? [])
                .filter((e) => e.enabled)
                .map((e) => (
                  <li key={e.key} className="rounded-xl border-[3px] border-black bg-raised p-3">
                    <b className="text-warn">{e.name}</b>{" "}
                    <span className="text-muted">
                      every {e.days.map((d) => DAYN[d]).join(" & ")}
                      {e.start_hour === 0 && e.end_hour === 24 ? ", all day" : `, ${e.start_hour}:00 to ${e.end_hour}:00`} UTC.
                    </span>
                    <div className="text-sm">
                      {e.effects.drop_mult ? `Drop odds boosted: ${Object.entries(e.effects.drop_mult).map(([t, m]) => `${FRAGMENTS.find((f) => f.type === t)?.name} ×${m}`).join(", ")}.` : ""}
                      {e.effects.points_mult ? ` Every $NOTTIES reward ×${e.effects.points_mult}.` : ""}
                      {e.effects.cooldown_mult ? ` Crate timers ×${e.effects.cooldown_mult}.` : ""}
                    </div>
                  </li>
                ))}
            </ul>
            {tl.active.length > 0 && <Tip>Live right now: {tl.active.map((e) => e.name).join(" + ")}. Go crack something.</Tip>}
            <p className="mt-3 text-muted">The team also drops surprise events. Follow {BRAND.xHandle} so you don&apos;t miss them.</p>
          </Chapter>

          <Chapter id="gangs" n={12} title="Gangs">
            <p>After your first crate you pick a gang. It&apos;s a one-time choice. Your $NOTTIES adds to your gang&apos;s total on the Most Wanted board.</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FACTIONS.map((f) => (
                <li key={f.id} className="overflow-hidden rounded-xl border-[3px] border-black" style={{ background: f.color }}>
                  <div className="relative aspect-square">
                    <Image src={f.img} alt="" fill sizes="200px" className="object-cover" />
                  </div>
                  <div className="p-2 text-black">
                    <div className="display">{f.name}</div>
                    <div className="text-xs font-semibold">{f.motto}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Pull something good? Hit <b>Brag</b> to post the card on X with your recruit link built in.
            </p>
          </Chapter>

          <Chapter id="recruit" n={13} title="Recruiting">
            <p>
              Your <b>Recruit Office</b> has a personal link. When someone joins through it and actually plays (cracks <b>{s.referral_qualify_claims} crates</b>), you get <b>+{P.referral} {POINTS_NAME}</b>. Signing up and leaving doesn&apos;t count.
            </p>
            <p className="mt-2 text-muted">Recruiting yourself, or a pile of fake accounts, gets them rejected and you flagged. I can tell.</p>
          </Chapter>

          <Chapter id="wanted" n={14} title="Most Wanted">
            <p>The leaderboard: most {POINTS_NAME}, first to assemble, most crates, best recruiters and most missions. The top three get wanted posters. Only fair, checked activity counts. Anyone under review is taken off the board until they&apos;re cleared.</p>
          </Chapter>

          <Chapter id="rules" n={15} title="House rules">
            <ul className="space-y-2">
              {[
                ["One person, one account.", "Extra accounts to farm crates or recruits get flagged and reviewed."],
                ["No bots or scripts.", "Hammering buttons or the API shows up instantly. Play with your thumbs."],
                ["Rewards can be paused.", "A flagged account can't claim, trade or assemble until a human has looked at it, and confirmed cheating loses the GTD spot."],
                ["We're fair about it.", "Nobody gets banned just for sharing Wi-Fi or a device type. Real people review flags."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3 rounded-xl border-[3px] border-black bg-raised p-3">
                  <TbShieldCheck size={20} className="shrink-0 text-accent" />
                  <span>
                    <b>{t}</b> <span className="text-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Chapter>

          <Chapter id="faq" n={16} title="FAQ">
            <div className="space-y-2">
              {[
                ["When is the mint?", `The mint is free. Date and chain get announced on X first: ${BRAND.xHandle}. Assembling now books your spot either way.`],
                ["Where do my mission rewards go?", "To your mailbox (the envelope at the top of the screen). Open it and tap Claim to get your $NOTTIES and free crates. Free crates wait on the Hunt page and have no timer."],
                ["When do new missions drop?", `Twice a day, at ${s.task_rounds.hours.map((h) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`).join(" and ")} ${s.task_rounds.label}. Each round's missions disappear when the next round starts, so don't leave them for later.`],
                ["Do I need a wallet to play?", "No. Play first. You only need to link a wallet before the allowlist snapshot so your Nottie can be delivered."],
                ["Can I build more than one Nottie?", "Not right now: one assembly and one guaranteed spot per account."],
                ["I'm stuck on one part. Help?", "Trade for it on the Black Market, or keep hunting. Every crate is a fresh roll."],
                ["Is the Nottie in the preview the one I'll get?", "It's a stand-in. Real traits stay sealed until the collection reveals."],
                ["Why is my crate timer different from my friend's?", "Each timer starts from when that person last cracked a crate."],
              ].map(([q, a]) => (
                <details key={q} className="card group p-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="display flex cursor-pointer list-none items-center justify-between gap-3">
                    {q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[3px] border-black bg-accent text-black transition group-open:rotate-45">
                      <TbPlus size={16} strokeWidth={3} />
                    </span>
                  </summary>
                  <p className="mt-2 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </Chapter>

          <section className="card card-lime p-6 text-center sm:p-10">
            <h2 className="display text-4xl text-black sm:text-5xl">Enough reading.</h2>
            <p className="mt-2 font-semibold text-black/70">A crate just washed up somewhere. Probably.</p>
            <Link href={x ? "/hunt" : enter} className="btn btn-ghost btn-xl mt-5">
              Go cause trouble <TbArrowRight size={22} strokeWidth={2.8} />
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

function Chapter({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-center gap-3">
        <span className="display grid h-10 w-10 shrink-0 -rotate-6 place-items-center rounded-xl border-[3px] border-black bg-accent text-lg text-black shadow-[0_3px_0_#000]">{n}</span>
        <h2 className="display ink-text text-3xl text-white sm:text-4xl">{title}</h2>
      </div>
      <div className="card p-5 leading-relaxed sm:p-6">{children}</div>
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-xl border-[3px] border-black bg-[#2e2600] p-3 text-sm">
      <span className="display shrink-0 rounded-md border-2 border-black bg-warn px-1.5 text-xs leading-5 text-black">Vlad&apos;s tip</span>
      <span className="text-warn">{children}</span>
    </div>
  );
}
