"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TbArrowRight, TbPlayerPlayFilled } from "react-icons/tb";
import { FRAGMENTS, PARTS, type FragmentType } from "@/lib/game/config";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { FragmentIcon } from "../FragmentIcon";
import { Coin } from "./Coin";
import { CardBack, FragmentCard } from "./FragmentCard";
import { NottieFigure } from "./NottieFigure";

const EVENT = "nt:intro";
const seenKey = (id: string) => `nt_intro_${id}`;

/** Opens the intro again from anywhere (menu, wiki). */
export function replayIntro() {
  window.dispatchEvent(new Event(EVENT));
}

export function ReplayIntro({ className = "btn btn-ghost" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={() => {
        sfx.click();
        // On the wiki there's no intro mounted, so hop into the game with ?intro=1.
        if (!document.querySelector("[data-intro-host]")) router.push("/dashboard?intro=1");
        else replayIntro();
      }}
    >
      <TbPlayerPlayFilled size={14} /> Replay the intro
    </button>
  );
}

/**
 * The entrance story: five comic panels narrated by Vlad, shown the first time a player enters on
 * this browser (or with ?intro=1, or via replayIntro()). Skippable at any point.
 */
export function IntroStory({ playerId, username, cooldownMinutes, cratePrice, timerOn }: { playerId: string; username: string; cooldownMinutes: number; cratePrice: number; timerOn: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const hours = cooldownMinutes / 60;
  const every = hours === 1 ? "every hour" : Number.isInteger(hours) ? `every ${hours} hours` : `every ${cooldownMinutes} min`;

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(seenKey(playerId)) === "1";
    } catch {}
    const forced = new URLSearchParams(window.location.search).get("intro") === "1";
    const t = setTimeout(() => {
      if (!seen || forced) {
        setStep(0);
        setOpen(true);
      }
    }, 350);
    const onReplay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(EVENT, onReplay);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENT, onReplay);
    };
  }, [playerId]);

  const close = useCallback(() => {
    try {
      localStorage.setItem(seenKey(playerId), "1");
    } catch {}
    setOpen(false);
    if (window.location.search.includes("intro=1")) window.history.replaceState(null, "", window.location.pathname);
  }, [playerId]);

  const PANELS = 5;
  const go = useCallback(
    (d: number) => {
      const n = Math.max(0, Math.min(PANELS - 1, step + d));
      if (n === step) return;
      if (d > 0) sfx.pop();
      else sfx.click();
      setStep(n);
    },
    [step],
  );

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, go, close]);

  if (!open) return <span data-intro-host hidden />;

  const last = step === PANELS - 1;

  return (
    <div data-intro-host className="fixed inset-0 z-[95] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Welcome to The Notties">
      <div className="card relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden">
        {/* top bar */}
        <div className="flex items-center justify-between border-b-[3px] border-black bg-black/40 px-4 py-2.5">
          <span className="display text-xs tracking-[0.2em] text-accent">Vlad&apos;s notebook · entry {step + 1}/{PANELS}</span>
          <button onClick={close} className="display rounded-full border-2 border-black bg-raised px-3 py-1 text-xs text-muted hover:text-text">
            Skip intro
          </button>
        </div>

        {/* panel */}
        <div key={step} className="anim-rise flex-1 overflow-y-auto">
          {step === 0 && (
            <Panel
              art={
                <div className="relative h-full w-full">
                  <Image src="/brand/hero-img-night-v2.webp" alt="" fill sizes="700px" className="object-cover" priority />
                  <div className="absolute inset-0 bg-white" style={{ animation: "flash 1.2s ease-out forwards" }} />
                  <div className="display ink-text absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 text-7xl text-accent anim-pop sm:text-8xl">BOOM!</div>
                </div>
              }
              kicker="Robinhood City, last Tuesday"
              title="Something went BOOM under the city."
              body={
                <>
                  Hi @{username}. I&apos;m Vlad. I run a perfectly normal underground lab. Last week my portal exploded and <b>5,760 little green troublemakers</b> fell out. Now crates full of their parts keep leaking all over town.
                </>
              }
            />
          )}
          {step === 1 && (
            <Panel
              art={
                <div className="relative grid h-full place-items-center">
                  <div className="beams" style={{ ["--beam" as string]: "#d79cff", opacity: 0.5 }} />
                  <div className="relative flex items-end gap-4">
                    <div className="h-[170px] w-[128px] -rotate-6">
                      <CardBack />
                    </div>
                    <div className="w-[128px] rotate-6 anim-pop">
                      <FragmentCard type="gear" size="sm" />
                    </div>
                  </div>
                </div>
              }
              kicker="Step 1 · Hunt"
              title="Crack the crates."
              body={
                <>
                  {timerOn ? (
                    <>
                      A Portal Crate washes up <b>{every}</b>. Tap it <b>three times</b> and it cracks open with one part inside.
                    </>
                  ) : (
                    <>
                      Quote one of our posts in <b>Missions</b> to earn your first crate. After that, crates cost <b>{cratePrice} $NOTTIES</b>. Tap one <b>three times</b> and it cracks open with one part inside.
                    </>
                  )}{" "}
                  Some parts are common. Some are very, very not.
                </>
              }
            />
          )}
          {step === 2 && (
            <Panel
              art={
                <div className="grid h-full place-items-center p-4">
                  <ul className="grid grid-cols-4 gap-3">
                    {PARTS.map((f, i) => (
                      <li key={f.type} className="grid h-16 w-16 place-items-center rounded-xl border-[3px] border-black bg-raised shadow-[0_4px_0_#000] sm:h-20 sm:w-20" style={{ animation: `pop .5s cubic-bezier(.2,1.4,.4,1) ${i * 0.09}s both` }}>
                        <FragmentIcon type={f.type} size={44} />
                      </li>
                    ))}
                  </ul>
                </div>
              }
              kicker="Step 2 · Collect"
              title="Find all 7 parts."
              body={
                <>
                  A background, shoes, an outfit, a mouth, eyes, something for the hands or head, and the rarest of all, the <b>Body</b>. The Body and the Hand &amp; Head are the hardest to find. Doubles? <b>Trade</b> them with other players for what you&apos;re missing.
                </>
              }
            />
          )}
          {step === 3 && (
            <Panel art={<AssemblingNottie />} kicker="Step 3 · Assemble" title="Build your Nottie." body={<>Got all 7? Take them to <b>my lab</b> and fire up the machine. Out comes a Nottie, and you become <b>One of Us</b>, which <b>locks your guaranteed mint spot</b>. One per account. No take-backs.</>} />
          )}
          {step === 4 && (
            <Panel
              art={
                <div className="relative grid h-full place-items-center">
                  <div className="beams" style={{ ["--beam" as string]: "#cdff00", opacity: 0.35 }} />
                  <div className="relative flex flex-col items-center">
                    <Coin size={110} className="anim-float" />
                    <div className="mt-3 flex gap-2">
                      {["Missions", "Trades", "Recruits", "Levels"].map((t, i) => (
                        <span key={t} className="display rounded-full border-[3px] border-black bg-accent px-2.5 py-0.5 text-xs text-black" style={{ animation: `pop .5s cubic-bezier(.2,1.4,.4,1) ${0.2 + i * 0.1}s both` }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              }
              kicker="Step 4 · Cause trouble"
              title="While you wait…"
              body={
                <>
                  Do <b>missions</b>, check in daily, gift cards and <b>recruit</b> your crew to earn <b>$NOTTIES</b>. Spend them on more crates, and climb the <b>Most Wanted</b> board. Every bit of $NOTTIES levels you up, from Stray all the way to Legend of Robinhood.
                </>
              }
            />
          )}
        </div>

        {/* controls */}
        <div className="flex items-center gap-3 border-t-[3px] border-black bg-black/40 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: PANELS }).map((_, i) => (
              <button key={i} tabIndex={-1} onClick={() => setStep(i)} className={`h-3 rounded-full border-2 border-black transition-all ${i === step ? "w-8 bg-accent" : i < step ? "w-3 bg-accent/60" : "w-3 bg-raised"}`} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => go(-1)} className="btn btn-ghost !min-h-[44px] !px-4 text-sm">
                Back
              </button>
            )}
            {!last ? (
              <button onClick={() => go(1)} className="btn btn-accent !min-h-[44px] text-sm">
                Next <TbArrowRight size={16} strokeWidth={2.8} />
              </button>
            ) : (
              <>
                <Link href="/wiki" onClick={close} className="btn btn-ghost !min-h-[44px] !px-4 text-sm">
                  Field guide
                </Link>
                <Link
                  href="/tasks"
                  onClick={() => {
                    sfx.levelUp();
                    fx.burst({ count: 140, power: 15 });
                    close();
                  }}
                  className="btn btn-accent anim-glow !min-h-[44px] text-sm"
                >
                  Earn my first crate!
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ art, kicker, title, body }: { art: React.ReactNode; kicker: string; title: string; body: React.ReactNode }) {
  return (
    <div>
      <div className="relative h-56 overflow-hidden border-b-[3px] border-black bg-[radial-gradient(ellipse_at_50%_40%,#2c341b,#11140c)] sm:h-72">{art}</div>
      <div className="p-5 sm:p-7">
        <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-accent px-2 py-0.5 text-[11px] tracking-[0.2em] text-black shadow-[0_3px_0_#000]">{kicker}</div>
        <h2 className="display ink-text mt-3 text-3xl leading-none text-white sm:text-4xl">{title}</h2>
        <p className="mt-3 leading-relaxed text-muted [&_b]:text-text">{body}</p>
      </div>
    </div>
  );
}

const ORDER: FragmentType[] = ["background", "shadow", "body", "shoes", "outfit", "mouth", "eyes", "gear"];

/** The Nottie fills in one part at a time, then sparks. */
function AssemblingNottie() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= ORDER.length + 3 ? 0 : x + 1)), 420);
    return () => clearInterval(t);
  }, []);
  const have = Object.fromEntries(ORDER.slice(0, Math.min(n, ORDER.length)).map((t) => [t, true]));
  const done = n >= ORDER.length;
  return (
    <div className="relative grid h-full place-items-center">
      {done && <div className="beams" style={{ ["--beam" as string]: "#cdff00", opacity: 0.5 }} />}
      <div className="relative">
        <NottieFigure have={have} size={150} charged={done} />
      </div>
      {done && <div className="stamp absolute right-6 top-6 text-lg anim-slam sm:right-16">One of us</div>}
    </div>
  );
}
