"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TbBolt, TbClover, TbShoppingBag, TbGift } from "react-icons/tb";
import { FaXTwitter } from "react-icons/fa6";
import { api, fmtDuration, idem, serverNow, timeLeft } from "@/lib/client";
import { FRAGMENT_BY_TYPE, RARITY_COLOR, RARITY_LABEL, type FragmentType, type Rarity } from "@/lib/game/config";
import { RARITY_TIER } from "@/lib/game/level";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { CardBack, FragmentCard } from "./game/FragmentCard";
import { Coin } from "./game/Coin";
import { useTurnstile } from "./game/Turnstile";
import { useMounted } from "./useMounted";

type Result = { id: string; type: FragmentType; rarity: Rarity; points: number; nextClaimAt?: string; pity: number; pityThreshold: number; pityHit: boolean; event: string | null; spent?: number };
type Phase = "idle" | "cracking" | "opening" | "reveal";
const TAPS = 3;
const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

export function CrateClaim(p: {
  nextClaimAt: string | null;
  enabled: boolean;
  suspended: boolean;
  cooldownMinutes: number;
  pity: number;
  pityThreshold: number;
  shop: { price: number; left: number; enabled: boolean; cooldownMinutes: number; nextBuyAt: string | null };
  points: number;
  eventName: string | null;
  freeCrates: number;
  timerOn: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const ts = useTurnstile();
  const [next, setNext] = useState<string | null>(p.nextClaimAt);
  const [now, setNow] = useState(() => serverNow());
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"timer" | "shop" | "free">(p.timerOn && p.freeCrates === 0 ? "timer" : "free");
  // Where the crate goes back to after a reveal: the timer if it's on, else a free crate, else the shop.
  const home = (free: number) => (p.timerOn && free === 0 ? "timer" : "free");
  const [taps, setTaps] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pity, setPity] = useState(p.pity);
  const [shopLeft, setShopLeft] = useState(p.shop.left);
  const [nextBuy, setNextBuy] = useState(p.shop.nextBuyAt);
  const [freeLeft, setFreeLeft] = useState(p.freeCrates);
  const [freeFrom, setFreeFrom] = useState(p.freeCrates);
  if (freeFrom !== p.freeCrates) {
    setFreeFrom(p.freeCrates);
    setFreeLeft(p.freeCrates);
  }
  const crateRef = useRef<HTMLButtonElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Promise<Result> | null>(null);
  const key = useRef<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 500);
    return () => clearInterval(t);
  }, []);

  const left = mounted ? timeLeft(next, now) : next ? Math.max(1, timeLeft(next, now)) : 0;
  const timerReady = mounted && left === 0 && p.enabled && !p.suspended;
  const buyWaitNow = mounted ? timeLeft(nextBuy, now) : 0;
  const ready = mode === "shop" ? !p.suspended && p.enabled && p.shop.enabled && shopLeft > 0 && buyWaitNow === 0 && p.points >= p.shop.price : mode === "free" ? !p.suspended && p.enabled && freeLeft > 0 : timerReady;
  const cooldownMs = p.cooldownMinutes * 60_000;
  const buyMs = Math.max(1, p.shop.cooldownMinutes * 60_000);
  const charge = ready ? 1 : mode === "free" ? 0 : mode === "shop" ? (buyWaitNow > 0 ? Math.max(0, 1 - buyWaitNow / buyMs) : Math.min(1, p.points / Math.max(1, p.shop.price))) : Math.max(0, Math.min(1, 1 - left / cooldownMs));

  function shake() {
    const el = shakeRef.current;
    if (!el) return;
    el.classList.remove("anim-shake");
    void el.offsetWidth;
    el.classList.add("anim-shake");
  }

  async function tap() {
    if (phase === "opening" || phase === "reveal") return;
    if (!ready) {
      sfx.error();
      buzz(60);
      shake();
      return;
    }
    setError(null);
    const n = taps + 1;
    setTaps(n);
    setPhase("cracking");
    sfx.crack(n);
    buzz(n === TAPS ? [30, 40, 60] : 25);
    shake();
    fx.burst({ at: crateRef.current, colors: ["#8a6a44", "#6b4a2a", "#3f2a15", "#cdff00"], count: 14 + n * 6, power: 7 + n * 2 });

    if (n === 1) {
      key.current ??= idem();
      const k = key.current;
      const path = mode === "shop" ? "/api/hunt/buy" : mode === "free" ? "/api/hunt/open" : "/api/hunt/claim";
      pending.current = ts.getToken().then((cf) => api<{ result: Result }>(path, { idem: k, cf }).then((r) => r.result));
      pending.current.catch(() => {});
    }
    if (n < TAPS) return;

    try {
      const r = await pending.current!;
      key.current = null;
      setResult(r);
      if (r.nextClaimAt) setNext(r.nextClaimAt);
      setPity(r.pity);
      if (mode === "shop") {
        setShopLeft((x) => Math.max(0, x - 1));
        if (p.shop.cooldownMinutes) setNextBuy(new Date(serverNow() + p.shop.cooldownMinutes * 60_000).toISOString());
      }
      if (mode === "free") setFreeLeft((x) => Math.max(0, x - 1));
      setPhase("opening");
      sfx.whoosh();
      await wait(550);
      setPhase("reveal");
      await wait(350);
      setFlipped(true);
      const tier = RARITY_TIER[r.rarity];
      sfx.reveal(tier);
      buzz(tier >= 3 ? [80, 60, 80, 60, 200] : tier >= 2 ? [60, 50, 120] : 40);
      if (tier >= 2) fx.burst({ at: crateRef.current, colors: [RARITY_COLOR[r.rarity], "#ffffff", "#cdff00"], count: 50 + tier * 40, power: 12 + tier * 2 });
      if (tier >= 4) fx.shake();
      if (r.points > 0) setTimeout(() => fx.float(`+${r.points}`, { at: crateRef.current }), 400);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claim failed";
      setError(msg);
      sfx.error();
      setPhase("idle");
      setTaps(0);
      if (/not ready|bought all|need \d+|no free crates|buy your next/i.test(msg)) {
        key.current = null;
        setMode(home(freeLeft));
        const me = await api<{ player: { nextClaimAt: string | null } }>("/api/me").catch(() => null);
        if (me) setNext(me.player.nextClaimAt);
      }
    }
  }

  function stash() {
    sfx.pop();
    setPhase("idle");
    setTaps(0);
    setFlipped(false);
    setResult(null);
    setMode(home(freeLeft));
  }

  const def = result ? FRAGMENT_BY_TYPE[result.type] : null;
  const beam = def ? RARITY_COLOR[def.rarity] : "#cdff00";
  const tier = def ? RARITY_TIER[def.rarity] : 0;
  const shareText = def ? `Just cracked ${tier >= 4 ? "a LEGENDARY" : tier === 3 ? "an Epic" : tier === 2 ? "a Rare" : "a"} ${def.name} out of Vlad's lab. Come cause trouble with @thenottiesworld` : "";

  return (
    <div className="card relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 30%, #2c341b 0%, #161a0f 60%, #0f120b 100%)" }}>
      <div className="scanlines absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[70%] -translate-x-1/2" style={{ background: "linear-gradient(180deg, rgba(205,255,0,.10), transparent 70%)", clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)" }} />

      {/* top strip: lucky meter + event */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black bg-black/30 px-4 py-2.5">
        <div className="flex items-center gap-2" title={`A Rare or better is guaranteed on crate ${p.pityThreshold} if you haven't had one`}>
          <TbClover size={18} className="text-accent" />
          <span className="display text-xs tracking-wider">Lucky meter</span>
          <div className="flex gap-0.5">
            {Array.from({ length: p.pityThreshold }).map((_, i) => (
              <span key={i} className={`h-3 w-2.5 rounded-sm border-2 border-black ${i < pity ? "bg-accent" : "bg-black/60"} ${i === p.pityThreshold - 1 ? "!w-4 !bg-warn" : ""}`} />
            ))}
          </div>
          <span className="whitespace-nowrap text-xs text-muted">{pity >= p.pityThreshold - 1 ? "Next is Rare+!" : `Rare+ in ${p.pityThreshold - pity}`}</span>
        </div>
        {p.eventName && (
          <span className="display flex items-center gap-1 rounded-full border-2 border-black bg-warn px-2.5 py-0.5 text-[11px] text-black">
            <TbBolt size={13} /> {p.eventName} live
          </span>
        )}
      </div>

      <div className="relative flex min-h-[500px] flex-col items-center justify-center px-4 py-10 text-center">
        {phase !== "reveal" ? (
          <>
            <div className="relative grid place-items-center">
              {(phase === "opening" || ready) && <div className="beams" style={{ ["--beam" as string]: phase === "opening" ? beam : mode !== "timer" ? "#ffd166" : "#cdff00", opacity: phase === "opening" ? 0.8 : 0.18 }} />}
              <ChargeRing pct={charge} ready={ready} gold={mode !== "timer"} />
              <div ref={shakeRef} className="relative">
                <button ref={crateRef} onClick={tap} disabled={phase === "opening"} className={`relative block cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-accent ${ready && phase === "idle" ? "anim-bob" : ""}`} style={{ filter: ready ? `drop-shadow(0 0 30px ${mode !== "timer" ? "rgba(255,209,102,.5)" : "rgba(205,255,0,.4)"})` : "grayscale(.6) brightness(.75)" }} aria-label={ready ? `Crack the crate, tap ${TAPS - taps} more times` : "Crate locked"}>
                  <Crate cracks={taps} opening={phase === "opening"} locked={!ready && phase === "idle"} gold={mode !== "timer"} />
                </button>
              </div>
            </div>

            <div className="mt-2 min-h-[140px]">
              {!p.enabled || p.suspended ? (
                <div className="display text-3xl">{p.suspended ? "Claims paused" : "Crates locked"}</div>
              ) : ready || phase !== "idle" ? (
                <>
                  {mode === "shop" && phase === "idle" && <div className="display mb-1 text-xs tracking-[0.25em] text-warn">Crate · {p.shop.price} $NOTTIES · you have {p.points.toLocaleString()}</div>}
                  {mode === "free" && phase === "idle" && <div className="display mb-1 text-xs tracking-[0.25em] text-warn">You have {freeLeft} crate{freeLeft === 1 ? "" : "s"}</div>}
                  <div className="display ink-text text-4xl text-white sm:text-5xl">{phase === "opening" ? "!!!" : taps === 0 ? "Tap to crack!" : taps === 1 ? "Again!" : "One more!"}</div>
                  <div className="mt-3 flex justify-center gap-2" aria-hidden>
                    {Array.from({ length: TAPS }).map((_, i) => (
                      <span key={i} className={`h-4 w-10 rounded-full border-[3px] border-black transition ${i < taps ? "bg-accent shadow-[0_0_12px_#cdff00]" : "bg-black/50"}`} />
                    ))}
                  </div>
                  {mode === "timer" && phase === "idle" && freeLeft > 0 && <div className="mt-3 text-sm font-bold text-warn">+ {freeLeft} free crate{freeLeft === 1 ? "" : "s"} waiting after this one</div>}
                  {mode !== "timer" && p.timerOn && phase === "idle" && (
                    <button onClick={() => (sfx.click(), setMode("timer"))} className="mt-3 text-xs text-muted underline">
                      Never mind
                    </button>
                  )}
                </>
              ) : mode !== "timer" ? (
                <>
                  <div className="display text-sm tracking-[0.25em] text-muted">Your crates</div>
                  <div className="display goo-text mt-1 text-6xl">0</div>
                  {p.points >= p.shop.price ? (
                    <>
                      <div className="mt-1 text-sm text-muted">
                        You have {p.points.toLocaleString()} $NOTTIES. A crate costs {p.shop.price}.
                      </div>
                      <Link href="/trade" className="btn btn-accent mt-4">
                        <TbShoppingBag size={18} /> Buy crates in the Market
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="mt-1 text-sm text-muted">
                        A crate costs {p.shop.price} $NOTTIES. You have {p.points.toLocaleString()}. Complete missions to earn more.
                      </div>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Link href="/tasks" className="btn btn-accent">
                          <Coin size={18} /> Earn $NOTTIES
                        </Link>
                        <Link href="/trade" className="btn btn-ghost">
                          <TbShoppingBag size={17} /> Market
                        </Link>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="display text-sm tracking-[0.25em] text-muted">Next crate in</div>
                  <div className="display goo-text mt-1 text-5xl tabular-nums sm:text-6xl" aria-live="polite">
                    {mounted ? fmtDuration(left) : "…"}
                  </div>
                  <div className="mt-1 text-sm text-muted">Recharging… {Math.round(charge * 100)}%</div>
                  {freeLeft > 0 && p.enabled && !p.suspended && (
                    <button
                      onClick={() => {
                        sfx.click();
                        setError(null);
                        setMode("free");
                      }}
                      className="btn btn-accent mt-4 anim-glow"
                    >
                      <TbGift size={18} /> Open a crate ({freeLeft} left)
                    </button>
                  )}
                  <Link href="/trade" className="btn btn-ghost mt-4 !min-h-[44px] text-sm">
                    <TbShoppingBag size={17} /> Buy crates in the Market
                  </Link>
                </>
              )}
              {error && (
                <div className="mt-3 text-sm font-bold text-error" role="alert">
                  {error}
                </div>
              )}
            </div>
          </>
        ) : (
          def &&
          result && (
            <div className="relative flex flex-col items-center">
              <div className="beams" style={{ ["--beam" as string]: beam, opacity: 0.7 }} />
              <div className="display ink-text relative mb-1 text-3xl sm:text-5xl anim-pop" style={{ color: beam }}>
                {tier >= 4 ? "LEGENDARY!!" : tier === 3 ? "EPIC DROP!" : tier === 2 ? "Rare find!" : RARITY_LABEL[def.rarity]}
              </div>
              <div className="relative mb-3 flex flex-wrap justify-center gap-2 text-[11px]">
                {result.pityHit && <span className="display rounded-full border-2 border-black bg-accent px-2 py-0.5 text-black">Lucky meter paid out</span>}
                {result.event && <span className="display rounded-full border-2 border-black bg-warn px-2 py-0.5 text-black">{result.event}</span>}
              </div>
              <div className={`flip relative h-[300px] w-56 ${flipped ? "is-flipped" : ""}`}>
                <div className="flip-inner">
                  <div className="flip-face">
                    <CardBack />
                  </div>
                  <div className="flip-face flip-back">
                    <FragmentCard type={def.type} size="lg" blurb className="!w-56" />
                  </div>
                </div>
              </div>
              {result.points > 0 && (
                <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-black/60 px-4 py-1.5 anim-pop">
                  <Coin size={24} />
                  <span className="display text-lg text-accent">+{result.points} $NOTTIES</span>
                </div>
              )}
              <div className="relative mt-6 flex flex-wrap justify-center gap-3">
                <button onClick={stash} className="btn btn-accent btn-xl">
                  Stash it
                </button>
                {tier >= 2 && (
                  <a href={`https://x.com/intent/post?${new URLSearchParams({ text: shareText, url: `${location.origin}/s/pull/${result.id}` })}`} target="_blank" rel="noreferrer" onClick={() => sfx.click()} className="btn btn-ghost btn-xl">
                    <FaXTwitter size={20} /> Brag
                  </a>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <ts.Widget />
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ChargeRing({ pct, ready, gold }: { pct: number; ready: boolean; gold: boolean }) {
  const r = 128;
  const c = 2 * Math.PI * r;
  const col = gold ? "#ffd166" : ready ? "#cdff00" : "#7fa000";
  return (
    <svg className="pointer-events-none absolute" width="290" height="290" viewBox="0 0 290 290" aria-hidden>
      <circle cx="145" cy="145" r={r} fill="none" stroke="#000" strokeWidth="14" opacity=".55" />
      <circle cx="145" cy="145" r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 145 145)" style={{ transition: "stroke-dashoffset .5s linear", filter: ready ? `drop-shadow(0 0 8px ${col})` : undefined }} />
    </svg>
  );
}

function Crate({ cracks, opening, locked, gold }: { cracks: number; opening: boolean; locked: boolean; gold: boolean }) {
  const glow = gold ? "#ffd166" : "#cdff00";
  return (
    <svg width="220" height="220" viewBox="0 0 200 200" fill="none" aria-hidden>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={gold ? "#c9962e" : "#7a5531"} />
          <stop offset="1" stopColor={gold ? "#7a5714" : "#3f2a15"} />
        </linearGradient>
        <radialGradient id="glowin" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#efffa0" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="182" rx="74" ry="11" fill="#000" opacity="0.5" />
      <path d="M30 84l70-30 70 30v70l-70 30-70-30z" fill="url(#cg)" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 84l70 30 70-30M100 114v70" stroke="#000" strokeWidth="4" />
      <path d="M42 98l50 21M108 119l50-21M38 128l54 23M108 151l54-23" stroke={gold ? "#ecc15d" : "#a07a4c"} strokeWidth="4" strokeLinecap="round" />
      {cracks > 0 && <ellipse cx="100" cy="112" rx={20 + cracks * 14} ry={8 + cracks * 5} fill="url(#glowin)" opacity={0.3 + cracks * 0.2} />}
      <g stroke={glow} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${glow})` }}>
        {cracks >= 1 && <path d="M62 104l8 10-6 8 9 12" />}
        {cracks >= 2 && <path d="M140 108l-10 9 7 7-9 14M100 130l-6 12 7 6-4 14" />}
        {cracks >= 3 && <path d="M46 132l12-2 4 10 10-4M150 136l-12 4-2 10-10-2M84 92l16 6 16-6" />}
      </g>
      <g>
        <rect x="86" y="102" width="28" height="22" rx="4" fill="#0a0b08" stroke="#000" strokeWidth="3" />
        {locked ? <path d="M93 102v-6a7 7 0 0 1 14 0v6" stroke="#9aa08f" strokeWidth="3.5" fill="none" /> : null}
        <circle cx="100" cy="113" r="5" fill={locked ? "#9aa08f" : glow}>{!locked && <animate attributeName="opacity" values="1;.35;1" dur="1.1s" repeatCount="indefinite" />}</circle>
      </g>
      <g style={opening ? { animation: "lid-fly .55s cubic-bezier(.3,.7,.4,1) forwards", transformOrigin: "100px 60px" } : undefined}>
        <path d="M24 80l76-33 76 33-76 33z" fill={gold ? "#d9a63a" : "#8a6a44"} stroke="#000" strokeWidth="4" strokeLinejoin="round" />
        <path d="M44 78l56 24M156 78l-56 24" stroke={gold ? "#8a6414" : "#5c4024"} strokeWidth="4" strokeLinecap="round" />
        <path d="M100 47v-6" stroke="#000" strokeWidth="4" />
      </g>
      {!locked && !opening && (
        <g stroke={glow} strokeWidth="3.5" strokeLinecap="round" opacity=".7">
          <path d="M100 28l0-14">
            <animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M80 32l-8-12">
            <animate attributeName="opacity" values=".2;1;.2" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M120 32l8-12">
            <animate attributeName="opacity" values=".6;.1;.6" dur="1.2s" repeatCount="indefinite" />
          </path>
        </g>
      )}
    </svg>
  );
}
