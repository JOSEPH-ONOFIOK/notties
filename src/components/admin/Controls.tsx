"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upcomingRounds, type RoundCfg } from "@/lib/game/rounds";
import { api } from "@/lib/client";
import type { Settings } from "@/lib/game/config";

async function save<K extends keyof Settings>(key: K, value: Settings[K]) {
  await api("/api/admin", { action: "setting", key, value });
}

export function Toggle({ k, label, value }: { k: keyof Settings; label: string; value: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-raised/40 px-4 py-3">
      <span className="font-bold">{label}</span>
      <button
        role="switch"
        aria-checked={v}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await save(k, !v as never);
            setV(!v);
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
        className={`relative h-7 w-12 rounded-full transition ${v ? "bg-accent" : "bg-border"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition ${v ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

export function NumberField({ k, label, value, hint, min = 0 }: { k: keyof Settings; label: string; value: number; hint?: string; min?: number }) {
  const router = useRouter();
  const [v, setV] = useState(String(value));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <div className="rounded-xl border border-border bg-raised/40 p-4">
      <label className="block text-sm font-bold">{label}</label>
      {hint && <div className="text-xs text-muted">{hint}</div>}
      <div className="mt-2 flex gap-2">
        <input type="number" min={min} value={v} onChange={(e) => setV(e.target.value)} className="w-32 tabular-nums" />
        <button
          className="btn btn-ghost text-sm"
          disabled={state === "saving"}
          onClick={async () => {
            setState("saving");
            try {
              await save(k, Number(v) as never);
              setState("saved");
              router.refresh();
              setTimeout(() => setState("idle"), 1200);
            } catch {
              setState("error");
            }
          }}
        >
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Failed" : "Save"}
        </button>
      </div>
    </div>
  );
}

/** Edit a {key: number} map (drop weights, pawn prices, recipe, points). */
export function MapField({ k, label, value, labels, hint }: { k: keyof Settings; label: string; value: Record<string, number>; labels: Record<string, string>; hint?: string }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(value).map(([a, b]) => [a, String(b)])));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const total = Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <div className="display text-xl">{label}</div>
        {k === "drop_weights" && <span className="text-xs text-muted">total weight {total}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.keys(value).map((key) => (
          <label key={key} className="text-xs">
            <span className="text-muted">{labels[key] ?? key}</span>
            <input type="number" min={0} value={v[key]} onChange={(e) => setV((m) => ({ ...m, [key]: e.target.value }))} className="mt-1 tabular-nums" />
            {k === "drop_weights" && total > 0 && <span className="text-[10px] text-muted">{Math.round(((Number(v[key]) || 0) / total) * 1000) / 10}%</span>}
          </label>
        ))}
      </div>
      <button
        className="btn btn-accent mt-4 text-sm"
        disabled={state === "saving"}
        onClick={async () => {
          setState("saving");
          try {
            await save(k, Object.fromEntries(Object.entries(v).map(([a, b]) => [a, Number(b) || 0])) as never);
            setState("saved");
            router.refresh();
            setTimeout(() => setState("idle"), 1200);
          } catch {
            setState("error");
          }
        }}
      >
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Failed" : "Save"}
      </button>
    </div>
  );
}

export function StatusButton({ userId, status }: { userId: string; status: "active" | "suspended" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === "active" ? "suspended" : "active";
  return (
    <button
      disabled={busy}
      onClick={async () => {
        const note = status === "active" ? prompt("Reason for suspension (logged):") : "restored";
        if (note === null) return;
        setBusy(true);
        try {
          await api("/api/admin", { action: "status", userId, status: next, note });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className={`btn text-sm ${status === "active" ? "btn-ghost text-error" : "btn-accent"}`}
    >
      {busy ? "…" : status === "active" ? "Suspend" : "Restore"}
    </button>
  );
}

export function ResolveButton({ riskId }: { riskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/admin", { action: "resolve", riskId });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="btn btn-ghost text-xs"
    >
      {busy ? "…" : "Clear"}
    </button>
  );
}

type TaskDraft = { id: string; title: string; description: string; points: number; kind: string; verify: string; link: string | null; sort: number; active: boolean; starts_at?: string | null; ends_at?: string | null; proof_hint?: string | null; gives_book?: boolean; crates?: number };
const toLocal = (v?: string | null) => (v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function TaskEditor({ initial, rounds }: { initial?: TaskDraft; rounds: RoundCfg }) {
  const router = useRouter();
  const options = upcomingRounds(rounds, 6);
  const blank = (): TaskDraft => ({ id: "", title: "", description: "", points: 100, kind: "once", verify: "link", link: "", sort: 10, active: true, crates: 1, starts_at: options[0].start, ends_at: options[0].end });
  const [t, setT] = useState<TaskDraft>(initial ?? blank());
  const roundIdx = options.findIndex((r) => r.start === (t.starts_at ? new Date(t.starts_at).toISOString() : null) && r.end === (t.ends_at ? new Date(t.ends_at).toISOString() : null));
  const pickRound = (v: string) => {
    if (v === "none") setT((x) => ({ ...x, starts_at: null, ends_at: null }));
    else if (v !== "custom") setT((x) => ({ ...x, starts_at: options[Number(v)].start, ends_at: options[Number(v)].end }));
  };
  const [state, setState] = useState<string | null>(null);
  const set = (k: keyof TaskDraft, v: unknown) => setT((x) => ({ ...x, [k]: v }));
  return (
    <div className="card p-5">
      <div className="display text-xl">{initial ? `Edit · ${initial.id}` : "New mission"}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs sm:col-span-2">
          <span className="text-muted">round (fresh missions drop at {rounds.hours.map((h) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`).join(" & ")} {rounds.label}; they disappear when the round ends)</span>
          <select value={!t.starts_at && !t.ends_at ? "none" : roundIdx >= 0 ? String(roundIdx) : "custom"} onChange={(e) => pickRound(e.target.value)}>
            {options.map((r, i) => (
              <option key={r.start} value={i}>
                {i === 0 ? "This round" : "Round"} · {r.label} {rounds.label}
              </option>
            ))}
            <option value="none">Always on (no round)</option>
            {roundIdx < 0 && (t.starts_at || t.ends_at) && <option value="custom">Custom dates (below)</option>}
          </select>
        </label>
        {initial && (
          <label className="text-xs">
            <span className="text-muted">id</span>
            <input value={t.id} disabled />
          </label>
        )}
        <label className="text-xs">
          <span className="text-muted">title</span>
          <input value={t.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-muted">description</span>
          <input value={t.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="text-xs">
          <span className="text-muted">$NOTTIES reward</span>
          <input type="number" value={t.points} onChange={(e) => set("points", Number(e.target.value))} />
        </label>
        <label className="text-xs">
          <span className="text-muted">free crates reward</span>
          <input type="number" min={0} max={10} value={t.crates ?? 1} onChange={(e) => set("crates", Number(e.target.value))} />
        </label>
        <label className="text-xs">
          <span className="text-muted">sort</span>
          <input type="number" value={t.sort} onChange={(e) => set("sort", Number(e.target.value))} />
        </label>
        <label className="text-xs">
          <span className="text-muted">kind</span>
          <select value={t.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="once">once</option>
            <option value="daily">daily</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-muted">verify</span>
          <select value={t.verify} onChange={(e) => set("verify", e.target.value)}>
            <option value="auto">auto (click to claim)</option>
            <option value="link">link (must open link first)</option>
            <option value="wallet">wallet linked</option>
            <option value="trade">has sent a trade</option>
            <option value="gift_today">gifted a card today (daily)</option>
            <option value="manual">manual review (player submits proof)</option>
          </select>
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-muted">link (https://… or /internal)</span>
          <input value={t.link ?? ""} onChange={(e) => set("link", e.target.value || null)} />
        </label>
        <label className="text-xs">
          <span className="text-muted">starts (optional)</span>
          <input type="datetime-local" value={toLocal(t.starts_at)} onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </label>
        <label className="text-xs">
          <span className="text-muted">ends (optional)</span>
          <input type="datetime-local" value={toLocal(t.ends_at)} onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </label>
        {t.verify === "manual" && (
          <label className="text-xs sm:col-span-2">
            <span className="text-muted">proof hint shown to players</span>
            <input value={t.proof_hint ?? ""} onChange={(e) => set("proof_hint", e.target.value || null)} placeholder="Link to your post" />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={t.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" /> active
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn btn-accent text-sm"
          onClick={async () => {
            setState("saving");
            try {
              await api("/api/admin", { action: "task", task: t });
              setState("saved");
              // A new mission form clears for the next one, keeping the same round.
              if (!initial) setT((x) => ({ ...blank(), starts_at: x.starts_at, ends_at: x.ends_at }));
              router.refresh();
            } catch (e) {
              setState(e instanceof Error ? e.message : "failed");
            }
          }}
        >
          {initial ? "Save" : "Add mission"}
        </button>
        {state && <span className="text-xs text-muted">{state}</span>}
      </div>
    </div>
  );
}

export function ArchiveExpiredButton({ count }: { count: number }) {
  const router = useRouter();
  const [state, setState] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        className="btn btn-ghost text-sm"
        disabled={!count || state === "…"}
        onClick={async () => {
          setState("…");
          try {
            const r = await api<{ result: { archived: number } }>("/api/admin", { action: "archive_expired" });
            setState(`archived ${r.result.archived}`);
            router.refresh();
          } catch (e) {
            setState(e instanceof Error ? e.message : "failed");
          }
        }}
      >
        Clear old missions ({count})
      </button>
      {state && state !== "…" && <span className="text-xs text-muted">{state}</span>}
    </span>
  );
}
