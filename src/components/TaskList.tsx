"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { TbArrowRight, TbBox, TbChevronDown, TbClock, TbExternalLink, TbFlame, TbSend } from "react-icons/tb";
import { serverNow } from "@/lib/client";
import { Coin } from "./game/Coin";
import { Countdown } from "./Countdown";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  points: number;
  kind: "once" | "daily";
  verify: "auto" | "link" | "wallet" | "trade" | "manual";
  link: string | null;
  completed: boolean;
  clicked: string | null;
  submission: string | null;
  proof_hint: string | null;
  crates: number;
  ends_at: string | null;
};

export type RoundInfo = { end: string; nextLabel: string; tz: string };

export type StreakInfo = { streak: number; checkedInToday: boolean; ladder: number[] };

const TILT = ["-rotate-[1.5deg]", "rotate-[1deg]", "-rotate-[0.5deg]", "rotate-[1.5deg]", "rotate-[0.5deg]", "-rotate-1"];
const TAPE = ["rgba(205,255,0,.6)", "rgba(138,215,255,.6)", "rgba(255,179,71,.65)", "rgba(215,156,255,.6)"];

export function TaskList({ tasks, suspended, streak, round }: { tasks: TaskItem[]; suspended: boolean; streak: StreakInfo; round: RoundInfo }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [justDone, setJustDone] = useState<Record<string, boolean>>({});
  const [clicked, setClicked] = useState<Record<string, boolean>>(Object.fromEntries(tasks.map((t) => [t.id, !!t.clicked])));
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const [proof, setProof] = useState<Record<string, string>>({});
  const [subs, setSubs] = useState<Record<string, string | null>>(Object.fromEntries(tasks.map((t) => [t.id, t.submission])));

  async function submit(t: TaskItem) {
    setBusy(t.id);
    setErr((e) => ({ ...e, [t.id]: "" }));
    try {
      await api("/api/tasks", { action: "submit", taskId: t.id, proof: proof[t.id] ?? "" });
      sfx.pop();
      setSubs((x) => ({ ...x, [t.id]: "pending" }));
    } catch (e) {
      sfx.error();
      setErr((x) => ({ ...x, [t.id]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setBusy(null);
    }
  }

  async function open(t: TaskItem) {
    sfx.click();
    if (t.link && /^https?:/.test(t.link)) window.open(t.link, "_blank", "noopener");
    setClicked((c) => ({ ...c, [t.id]: true }));
    await api("/api/tasks", { action: "click", taskId: t.id }).catch(() => {});
  }

  async function claim(t: TaskItem) {
    setBusy(t.id);
    setErr((e) => ({ ...e, [t.id]: "" }));
    try {
      await api<{ result: { points: number; crates: number } }>("/api/tasks", { action: "claim", taskId: t.id });
      const el = btns.current[t.id];
      sfx.coin();
      fx.float("Sent to your mailbox!", { at: el });
      fx.burst({ at: el, count: 40, power: 9, colors: ["#cdff00", "#ffffff", "#ffd166"] });
      setTimeout(() => sfx.stamp(), 150);
      setJustDone((d) => ({ ...d, [t.id]: true }));
      router.refresh();
    } catch (e) {
      sfx.error();
      setErr((x) => ({ ...x, [t.id]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setBusy(null);
    }
  }

  const isDone = (t: TaskItem) => t.completed || !!justDone[t.id];
  // Timed missions belong to the current round; the rest are permanent. Finished permanent
  // missions fold away so the board only shows what's left to do.
  const timed = tasks.filter((t) => t.ends_at && t.kind === "once");
  const daily = tasks.filter((t) => t.kind === "daily");
  const once = tasks.filter((t) => !t.ends_at && t.kind === "once" && !t.completed);
  const finished = tasks.filter((t) => !t.ends_at && t.kind === "once" && t.completed);
  const doneCount = tasks.filter(isDone).length;
  const [showDone, setShowDone] = useState(false);

  const note = (t: TaskItem, i: number) => {
    const done = t.completed || justDone[t.id];
    const needsLink = t.verify === "link";
    const internal = t.link && t.link.startsWith("/");
    return (
      <li key={t.id} className={`paper relative flex flex-col p-5 pt-6 transition hover:rotate-0 ${TILT[i % TILT.length]} ${done ? "opacity-80" : ""}`}>
        <span className="tape" style={{ background: TAPE[i % TAPE.length] }} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="display text-[10px] tracking-[0.25em] text-black/50">{t.kind === "daily" ? "Daily job" : t.ends_at ? "This round" : "Mission"}</div>
            <div className="display mt-0.5 text-xl leading-tight">{t.title}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-1 rounded-full border-[3px] border-black bg-black px-2 py-1 shadow-[0_3px_0_rgba(0,0,0,.35)]">
              <Coin size={18} />
              <span className="display text-sm text-accent">+{t.points}</span>
            </div>
            {t.crates > 0 && (
              <div className="flex items-center gap-1 rounded-full border-[3px] border-black bg-warn px-2 py-0.5 text-black shadow-[0_3px_0_rgba(0,0,0,.35)]">
                <TbBox size={15} strokeWidth={2.6} />
                <span className="display text-xs">+{t.crates} crate{t.crates === 1 ? "" : "s"}</span>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 flex-1 text-sm text-black/70">{t.description}</p>
        {t.id === "daily_checkin" && <StreakStrip s={streak} />}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!done && t.verify === "manual" && (
            subs[t.id] === "pending" ? (
              <span className="display rounded-full border-[3px] border-black bg-warn px-3 py-1.5 text-xs text-black">Under review</span>
            ) : (
              <div className="flex w-full flex-col gap-2">
                {subs[t.id] === "rejected" && <span className="text-xs font-bold text-[#b42318]">Not approved. Try again with a clearer link.</span>}
                {t.link && (
                  <a href={t.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-black/60 underline">
                    Open the task link
                  </a>
                )}
                <div className="flex gap-2">
                  <input value={proof[t.id] ?? ""} onChange={(e) => setProof((x) => ({ ...x, [t.id]: e.target.value }))} placeholder={t.proof_hint ?? "Link to your post"} className="!min-h-[42px] !border-black !bg-white !text-black" />
                  <button onClick={() => submit(t)} disabled={suspended || busy === t.id} className="btn btn-accent !min-h-[42px] !px-4 text-sm" aria-label="Submit proof">
                    <TbSend size={16} />
                  </button>
                </div>
              </div>
            )
          )}
          {!done && t.verify !== "manual" && (
            <>
              {needsLink && (
                <button onClick={() => open(t)} className="btn btn-ghost !min-h-[42px] !px-4 text-sm">
                  {clicked[t.id] ? "Open again" : "Open"} <TbExternalLink size={15} strokeWidth={2.6} />
                </button>
              )}
              {internal && !needsLink && (
                <Link href={t.link!} onClick={() => sfx.click()} className="btn btn-ghost !min-h-[42px] !px-4 text-sm">
                  Go <TbArrowRight size={15} strokeWidth={2.8} />
                </Link>
              )}
              <button ref={(el) => void (btns.current[t.id] = el)} onClick={() => claim(t)} disabled={suspended || busy === t.id || (needsLink && !clicked[t.id])} className="btn btn-accent !min-h-[42px] !px-5 text-sm">
                {busy === t.id ? "Checking…" : "Claim"}
              </button>
            </>
          )}
          {err[t.id] && <span className="text-sm font-bold text-[#b42318]">{err[t.id]}</span>}
        </div>

        {done && (
          <div className={`pointer-events-none absolute inset-0 grid place-items-center ${justDone[t.id] ? "anim-slam" : ""}`} style={{ transform: "rotate(-12deg)" }}>
            <span className="display rounded-lg border-[5px] border-[#2f8a00] px-4 py-1 text-4xl tracking-widest text-[#2f8a00] opacity-80" style={{ boxShadow: "inset 0 0 0 2px #f4efd8, inset 0 0 0 4px #2f8a00" }}>
              {t.kind === "daily" ? "Done today" : "Done"}
            </span>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="card relative overflow-hidden p-4 sm:p-8" style={{ background: "#3b2a19", backgroundImage: "radial-gradient(rgba(0,0,0,.25) 1.5px, transparent 2px), radial-gradient(rgba(255,255,255,.04) 1px, transparent 1.5px)", backgroundSize: "14px 14px, 9px 9px" }}>
      <RoundBanner round={round} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="display rounded-md border-[3px] border-black bg-paper px-3 py-1 text-paper-ink shadow-[0_4px_0_#000]">
          {doneCount}/{tasks.length} missions done
        </div>
        <div className="h-4 w-full max-w-48 overflow-hidden rounded-full border-[3px] border-black bg-black/60">
          <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} />
        </div>
      </div>
      <h2 className="display ink-text mb-4 text-2xl text-white">This round</h2>
      {timed.length > 0 ? (
        <ul className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{timed.map((t, i) => note(t, i))}</ul>
      ) : (
        <p className="mb-10 rounded-xl border-[3px] border-black bg-black/40 p-4 text-sm text-white/80">No round missions right now. Fresh ones drop at {round.nextLabel} {round.tz}.</p>
      )}
      {daily.length > 0 && (
        <>
          <h2 className="display ink-text mb-4 text-2xl text-white">Daily jobs</h2>
          <ul className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{daily.map((t, i) => note(t, i + 1))}</ul>
        </>
      )}
      {once.length > 0 && (
        <>
          <h2 className="display ink-text mb-4 text-2xl text-white">Missions</h2>
          <ul className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{once.map((t, i) => note(t, i + 2))}</ul>
        </>
      )}
      {finished.length > 0 && (
        <>
          <button onClick={() => setShowDone((v) => !v)} className="display flex items-center gap-1.5 text-sm text-white/70 hover:text-white" aria-expanded={showDone}>
            <TbChevronDown size={18} className={`transition ${showDone ? "rotate-180" : ""}`} /> Finished missions ({finished.length})
          </button>
          {showDone && <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{finished.map((t, i) => note(t, i + 3))}</ul>}
        </>
      )}
    </div>
  );
}

/** Countdown to the end of the current round. When it hits zero the page refreshes into the new round. */
function RoundBanner({ round }: { round: RoundInfo }) {
  const router = useRouter();
  useEffect(() => {
    const ms = Date.parse(round.end) - serverNow();
    if (ms <= 0 || ms > 24 * 3600_000) return;
    const t = setTimeout(() => router.refresh(), ms + 1500);
    return () => clearTimeout(t);
  }, [round.end, router]);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-[3px] border-black bg-black/50 p-3 text-white shadow-[0_4px_0_#000]">
      <span className="flex items-center gap-2">
        <TbClock size={20} className="text-accent" />
        <span className="display text-xs tracking-widest text-white/70">Round ends in</span>
        <Countdown until={round.end} readyText="Refreshing…" className="display text-xl text-accent" plain />
      </span>
      <span className="text-xs text-white/70">
        New missions every 12 hours. Next drop: <b className="text-white">{round.nextLabel} {round.tz}</b>
      </span>
    </div>
  );
}

function StreakStrip({ s }: { s: StreakInfo }) {
  const ladder = s.ladder.length ? s.ladder : [10];
  const today = s.checkedInToday ? s.streak : s.streak + 1; // the day you're on (or about to claim)
  const window = Math.max(ladder.length, 7);
  return (
    <div className="mt-3 rounded-xl border-2 border-black/80 bg-black/5 p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-black/70">
        <TbFlame size={16} className="text-[#e26b00]" /> {s.streak > 0 ? `${s.streak}-day streak` : "No streak yet"}
        <span className="ml-auto font-normal">{s.checkedInToday ? `Tomorrow: +${ladder[Math.min(s.streak + 1, ladder.length) - 1]}` : "Miss a day and it resets"}</span>
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${window}, minmax(0, 1fr))` }}>
        {Array.from({ length: window }).map((_, i) => {
          const day = i + 1;
          const got = day <= (s.checkedInToday ? s.streak : s.streak);
          const isToday = day === today;
          return (
            <div key={i} className={`rounded-md border-2 border-black py-1 text-center ${got ? "bg-[#ffb347] text-black" : isToday ? "bg-white text-black" : "bg-black/10 text-black/40"}`}>
              <div className="text-[9px] font-bold uppercase leading-none">D{day}</div>
              <div className="display text-[11px] leading-tight">+{ladder[Math.min(day, ladder.length) - 1]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
