"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TbCheck } from "react-icons/tb";
import { ShareCard } from "./CopyButton";
import { api, idem } from "@/lib/client";
import { FRAGMENT_BY_TYPE, POINTS_NAME, type FragmentType } from "@/lib/game/config";

const ALL_PARTS = { background: true, shadow: true, body: true, shoes: true, outfit: true, mouth: true, eyes: true, gear: true };
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { FragmentCard } from "./game/FragmentCard";
import { NottieFigure } from "./game/NottieFigure";
import { ProgressBar, fmtDate } from "./ui";

type Slot = { type: FragmentType; need: number; have: number; done: boolean };

export function ForgeBench(p: { playerId?: string; slots: Slot[]; pct: number; complete: boolean; enabled: boolean; suspended: boolean; forgedAt: string | null; seed: number | null; username: string; wallet: string | null; forgePoints: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [phase, setPhase] = useState<"idle" | "charging" | "flash">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ forgedAt: string; seed: number; fresh: boolean } | null>(p.forgedAt && p.seed ? { forgedAt: p.forgedAt, seed: p.seed, fresh: false } : null);

  const have = Object.fromEntries(p.slots.map((s) => [s.type, s.done])) as Record<FragmentType, boolean>;
  const missing = p.slots.filter((s) => !s.done);

  async function forge() {
    setConfirm(false);
    setError(null);
    setPhase("charging");
    const zaps = setInterval(() => sfx.zap(), 220);
    try {
      const req = api<{ result: { forgedAt: string; seed: number } }>("/api/forge", { idem: idem() });
      const [{ result }] = await Promise.all([req, new Promise((r) => setTimeout(r, 2000))]);
      clearInterval(zaps);
      setPhase("flash");
      sfx.stamp();
      fx.shake();
      await new Promise((r) => setTimeout(r, 450));
      setDone({ ...result, fresh: true });
      sfx.levelUp();
      fx.burst({ count: 220, power: 18 });
      setTimeout(() => fx.float(`+${p.forgePoints}`), 500);
      router.refresh();
    } catch (e) {
      clearInterval(zaps);
      sfx.error();
      setError(e instanceof Error ? e.message : "Forge failed");
    } finally {
      setPhase("idle");
    }
  }

  if (done) return <ForgeComplete forgedAt={done.forgedAt} seed={done.seed} username={p.username} wallet={p.wallet} fresh={done.fresh} playerId={p.playerId} />;

  const left = p.slots.slice(0, 4);
  const right = p.slots.slice(4);

  return (
    <>
      {phase === "flash" && <div className="pointer-events-none fixed inset-0 z-[85] bg-white" style={{ animation: "flash .45s ease-out forwards" }} />}

      <div className="card relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 35%, #26301a 0%, #141810 65%)" }}>
        <div className="scanlines absolute inset-0" />
        {/* lab tubes */}
        <div className="pointer-events-none absolute inset-y-0 left-6 hidden w-3 rounded-full border-[3px] border-black bg-accent/30 lg:block" />
        <div className="pointer-events-none absolute inset-y-0 right-6 hidden w-3 rounded-full border-[3px] border-black bg-accent/30 lg:block" />

        <div className="relative grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto_1fr]">
          <SlotColumn slots={left} />
          <div className="relative flex flex-col items-center">
            {phase === "charging" && <div className="beams" style={{ ["--beam" as string]: "#cdff00", opacity: 0.6 }} />}
            <div className={`relative ${phase === "charging" ? "anim-wiggle" : "anim-float"}`}>
              <NottieFigure have={have} charged={phase === "charging"} size={220} />
            </div>
            {/* platform */}
            <div className="relative -mt-4 h-8 w-64 rounded-[50%] border-[3px] border-black bg-[#2a3020] shadow-[0_6px_0_#000]">
              <div className="absolute inset-2 rounded-[50%] border-2 border-dashed border-accent/50" />
            </div>
          </div>
          <SlotColumn slots={right} />
        </div>

        <div className="relative border-t-[3px] border-black bg-black/30 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[200px] flex-1">
              <div className="display mb-1.5 flex items-center justify-between text-sm">
                <span>Assembly</span>
                <span className="text-accent">
                  {p.slots.filter((s) => s.done).length}/{p.slots.length} parts
                </span>
              </div>
              <ProgressBar pct={p.pct} tall />
              <p className="mt-2 text-xs text-muted">{p.complete ? `Uses one of each fragment. Spares stay in your stash. Pays ${p.forgePoints} ${POINTS_NAME} and locks your GTD spot.` : `Still missing: ${missing.map((m) => FRAGMENT_BY_TYPE[m.type].name).join(", ")}.`}</p>
            </div>
            <button onClick={() => (sfx.click(), setConfirm(true))} disabled={!p.complete || !p.enabled || p.suspended || phase !== "idle"} className={`btn btn-accent btn-xl ${p.complete && p.enabled ? "anim-glow" : ""}`}>
              {!p.enabled ? "Lab closed" : phase === "charging" ? "Charging…" : p.complete ? "Assemble!" : "Locked"}
            </button>
          </div>
          {error && (
            <div className="mt-3 text-sm font-bold text-error" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="card w-full max-w-sm p-6 text-center anim-pop">
            <div className="display ink-text text-3xl text-white">Fire up the machine?</div>
            <p className="mt-2 text-sm text-muted">One of each fragment goes in. A Nottie comes out. This can&apos;t be undone, and each account assembles once.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={forge} className="btn btn-accent flex-1">
                Do it
              </button>
              <button onClick={() => (sfx.click(), setConfirm(false))} className="btn btn-ghost">
                Wait
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SlotColumn({ slots }: { slots: Slot[] }) {
  return (
    <ul className="grid grid-cols-4 gap-2 lg:grid-cols-2 lg:gap-3">
      {slots.map((s) => (
        <li key={s.type} className="relative">
          <FragmentCard type={s.type} size="sm" locked={!s.done} count={s.have > 1 ? s.have : undefined} />
          {s.done && (
            <span className="display absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-[3px] border-black bg-accent text-black">
              <TbCheck size={14} strokeWidth={3.5} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ForgeComplete({ forgedAt, seed, username, wallet, fresh = false, playerId }: { forgedAt: string; seed: number; username: string; wallet: string | null; fresh?: boolean; playerId?: string }) {
  return (
    <div className="card card-lime relative overflow-hidden p-6 sm:p-10 anim-rise">
      <div className="beams" style={{ ["--beam" as string]: "#ffffff", opacity: 0.35 }} />
      <div className="relative grid items-center gap-8 md:grid-cols-[320px_1fr]">
        <div className="relative mx-auto w-full max-w-[300px]">
          <div className="relative aspect-square overflow-hidden rounded-3xl border-[4px] border-black bg-raised shadow-[0_8px_0_#000]">
            <NottieFigure have={ALL_PARTS} seed={seed} size={300} className="!h-full !w-full !rounded-none !border-0 [&>img]:!h-full [&>img]:!w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-black/75 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/80">Preview · final traits reveal at mint</div>
          </div>
          <div className={`stamp absolute -right-4 -top-5 text-2xl ${fresh ? "anim-slam" : ""}`} style={{ background: "#000" }}>
            Approved
          </div>
        </div>
        <div className="text-black">
          <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-black px-2 py-0.5 text-xs tracking-[0.2em] text-accent">Forge complete</div>
          <h2 className="display mt-3 text-5xl leading-[0.92] sm:text-7xl">
            Now one
            <br />
            of us.
          </h2>
          <p className="mt-3 max-w-md font-semibold text-black/75">@{username} assembled a Nottie on {fmtDate(forgedAt)}. Your guaranteed mint spot is booked. Now go cause trouble until mint day.</p>
          {playerId && <ShareCard kind="nottie" id={playerId} text="I just assembled my Nottie and I'm officially one of us. Come cause trouble with @thenottiesworld" label="Share my Nottie" className="btn btn-ghost mt-5" />}
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Row k="Status" v="One of Us" />
            <Row k="Mint phase" v="1 · Guaranteed" />
            <Row k="Assembled" v={fmtDate(forgedAt)} />
            <Row k="Mint wallet" v={wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Link one"} href={wallet ? undefined : "/wallet"} warn={!wallet} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, href, warn }: { k: string; v: string; href?: string; warn?: boolean }) {
  const inner = (
    <>
      <dt className="display text-[10px] tracking-widest text-white/60">{k}</dt>
      <dd className={`display mt-0.5 ${warn ? "text-warn" : "text-white"}`}>{v}</dd>
    </>
  );
  const cls = "rounded-xl border-[3px] border-black bg-black p-3 shadow-[0_4px_0_rgba(0,0,0,.5)]";
  return href ? (
    <Link href={href} className={`${cls} transition hover:-translate-y-0.5`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
