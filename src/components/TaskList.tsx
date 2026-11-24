"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { TbArrowRight, TbBox, TbCheck, TbChevronDown, TbClock, TbExternalLink, TbFlame, TbSend, TbTarget } from "react-icons/tb";
import { Coin } from "./game/Coin";
import { Countdown } from "./Countdown";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  points: number;
  kind: "once" | "daily";
  verify: "auto" | "link" | "wallet" | "trade" | "gift_today" | "runner" | "manual";
  link: string | null;
  completed: boolean;
  clicked: string | null;
  submission: string | null;
  proof_hint: string | null;
  crates: number;
  ends_at: string | null;
  late?: boolean;
  fullPoints?: number;
  closes_at?: string | null;
};

export type StreakInfo = { streak: number; checkedInToday: boolean; ladder: number[] };


export function TaskList({ tasks, suspended, streak, latePct }: { tasks: TaskItem[]; suspended: boolean; streak: StreakInfo; latePct: number }) {
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
  const timed = tasks.filter((t) => t.ends_at && t.kind === "once" && !t.completed).sort((a, b) => Date.parse(a.ends_at!) - Date.parse(b.ends_at!));
  const daily = tasks.filter((t) => t.kind === "daily");
  const once = tasks.filter((t) => !t.ends_at && t.kind === "once" && !t.completed);
  const finished = tasks.filter((t) => t.kind === "once" && t.completed);
  const doneCount = tasks.filter(isDone).length;
  const [showDone, setShowDone] = useState(false);

  const note = (t: TaskItem) => {
    const done = t.completed || justDone[t.id];
    const needsLink = t.verify === "link";
    const internal = t.link && t.link.startsWith("/");
    return (
      <li key={t.id} className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 ${done ? "opacity-60" : ""}`}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-black ${done ? "bg-accent text-black" : "bg-black/50 text-muted"}`}>
            {done ? <TbCheck size={16} strokeWidth={3} /> : t.kind === "daily" ? <TbFlame size={16} /> : t.ends_at ? <TbClock size={16} /> : <TbTarget size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="display text-base leading-tight">{t.title}</span>
              <span className="display inline-flex items-center gap-1 rounded-full border-2 border-black bg-black px-2 py-px text-xs text-accent">
                <Coin size={13} /> +{t.points}
              </span>
              {t.crates > 0 && (
                <span className="display inline-flex items-center gap-1 rounded-full border-2 border-black bg-warn px-2 py-px text-xs text-black">
                  <TbBox size={12} /> +{t.crates}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted">{t.description}</p>
            {t.ends_at && !done && (
              <div className={`mt-1 flex flex-wrap items-center gap-1 text-xs font-bold ${t.late ? "text-[#ff8a6b]" : "text-accent"}`}>
                <TbClock size={13} />
                {t.late ? (
                  <>
                    Late: {latePct}% reward (was {t.fullPoints}). Closes in <Countdown until={t.closes_at ?? null} readyText="now" plain className="inline" />
                  </>
                ) : (
                  <>
                    Full reward for <Countdown until={t.ends_at} readyText="0s" plain className="inline" />
                  </>
                )}
              </div>
            )}
            {t.id === "daily_checkin" && !done && <StreakStrip s={streak} />}
            {!done && t.verify === "manual" && subs[t.id] !== "pending" && (
              <div className="mt-2 flex flex-col gap-2">
                {subs[t.id] === "rejected" && <span className="text-xs font-bold text-error">Not approved. Try again with a clearer link.</span>}
                {t.link && (
                  <a href={t.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-accent underline">
                    Open the task link
                  </a>
                )}
                <div className="flex gap-2">
                  <input value={proof[t.id] ?? ""} onChange={(e) => setProof((x) => ({ ...x, [t.id]: e.target.value }))} placeholder={t.proof_hint ?? "Link to your post"} className="!min-h-[40px] min-w-0 flex-1" />
                  <button onClick={() => submit(t)} disabled={suspended || busy === t.id} className="btn btn-accent !min-h-[40px] !px-4 text-sm" aria-label="Submit proof">
                    <TbSend size={16} />
                  </button>
                </div>
              </div>
            )}
            {err[t.id] && <div className="mt-1 text-sm font-bold text-error">{err[t.id]}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
          {done ? (
            <span className="display text-xs tracking-widest text-accent">{t.kind === "daily" ? "Done today" : "Done"}</span>
          ) : t.verify === "manual" ? (
            subs[t.id] === "pending" && <span className="display rounded-full border-2 border-black bg-warn px-3 py-1 text-xs text-black">Under review</span>
          ) : (
            <>
              {needsLink && (
                <button onClick={() => open(t)} className="btn btn-ghost !min-h-[38px] !px-3 text-sm">
                  {clicked[t.id] ? "Again" : "Open"} <TbExternalLink size={14} strokeWidth={2.6} />
                </button>
              )}
              {internal && !needsLink && (
                <Link href={t.link!} onClick={() => sfx.click()} className="btn btn-ghost !min-h-[38px] !px-3 text-sm">
                  {t.link === "/play" ? "🏃 Run" : "Go"} <TbArrowRight size={14} strokeWidth={2.8} />
                </Link>
              )}
              <button ref={(el) => void (btns.current[t.id] = el)} onClick={() => claim(t)} disabled={suspended || busy === t.id || (needsLink && !clicked[t.id])} className="btn btn-accent !min-h-[38px] !px-4 text-sm">
                {busy === t.id ? "…" : "Claim"}
              </button>
            </>
          )}
        </div>
      </li>
    );
  };

  const section = (id: string | undefined, title: string, list: TaskItem[], sub?: string, empty?: string) => (
    <section className="mb-6">
      <h2 id={id} className="display mb-1 scroll-mt-32 text-xl">
        {title} <span className="text-muted">({list.length})</span>
      </h2>
      {sub && <p className="mb-2 text-sm text-muted">{sub}</p>}
      {list.length > 0 ? <ul className="card divide-y-2 divide-black/60 overflow-hidden p-0">{list.map((t) => note(t))}</ul> : empty ? <p className="card p-4 text-sm text-muted">{empty}</p> : null}
    </section>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="display text-sm">
          {doneCount}/{tasks.length} done
        </span>
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-black bg-black/60">
          <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} />
        </div>
      </div>
      {section("round", "Timed missions", timed, "Grab them before the timer ends. After that they move down to the regular missions.", "No timed missions right now. New ones drop here, so check back often.")}
      {daily.length > 0 && section("daily", "Daily", daily)}
      {once.length > 0 && section(undefined, "Missions", once)}
      {finished.length > 0 && (
        <section>
          <button onClick={() => setShowDone((v) => !v)} className="display flex items-center gap-1.5 text-sm text-muted hover:text-text" aria-expanded={showDone}>
            <TbChevronDown size={18} className={`transition ${showDone ? "rotate-180" : ""}`} /> Finished ({finished.length})
          </button>
          {showDone && <ul className="card mt-2 divide-y-2 divide-black/60 overflow-hidden p-0">{finished.map((t) => note(t))}</ul>}
        </section>
      )}
    </div>
  );
}

function StreakStrip({ s }: { s: StreakInfo }) {
  const ladder = s.ladder.length ? s.ladder : [10];
  const today = s.checkedInToday ? s.streak : s.streak + 1; // the day you're on (or about to claim)
  const window = Math.max(ladder.length, 7);
  return (
    <div className="mt-2 max-w-md rounded-xl border-2 border-black bg-black/40 p-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <TbFlame size={16} className="text-[#e26b00]" /> {s.streak > 0 ? `${s.streak}-day streak` : "No streak yet"}
        <span className="ml-auto font-normal">{s.checkedInToday ? `Tomorrow: +${ladder[Math.min(s.streak + 1, ladder.length) - 1]}` : "Miss a day and it resets"}</span>
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${window}, minmax(0, 1fr))` }}>
        {Array.from({ length: window }).map((_, i) => {
          const day = i + 1;
          const got = day <= (s.checkedInToday ? s.streak : s.streak);
          const isToday = day === today;
          return (
            <div key={i} className={`rounded-md border-2 border-black py-1 text-center ${got ? "bg-[#ffb347] text-black" : isToday ? "bg-accent text-black" : "bg-black/40 text-white/40"}`}>
              <div className="text-[9px] font-bold uppercase leading-none">D{day}</div>
              <div className="display text-[11px] leading-tight">+{ladder[Math.min(day, ladder.length) - 1]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
