"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, idem } from "@/lib/client";
import { FRAGMENTS, FRAGMENT_BY_TYPE, type FragmentType } from "@/lib/game/config";
import { FragmentIcon } from "./FragmentIcon";
import { Avatar } from "./Nav";
import { TbCheck } from "react-icons/tb";
import { FragmentCard } from "./game/FragmentCard";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";

type Recipient = { id: string; username: string; displayName: string; avatar: string | null; since: string; self: boolean };

export function TradeForm({ inventory, enabled, suspended, initialTo }: { inventory: Record<FragmentType, number>; enabled: boolean; suspended: boolean; initialTo?: string }) {
  const router = useRouter();
  const owned = FRAGMENTS.filter((f) => inventory[f.type] > 0);
  const [type, setType] = useState<FragmentType | null>(owned[0]?.type ?? null);
  const [qty, setQty] = useState(1);
  const [to, setTo] = useState(initialTo ?? "");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [looking, setLooking] = useState(false);
  const [step, setStep] = useState<"pick" | "confirm" | "done">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = type ? inventory[type] : 0;

  function onTo(v: string) {
    setTo(v);
    setRecipient(null);
    setLooking(v.trim().replace(/^@/, "").length >= 2);
  }

  // Debounced lookup; state only changes inside the timer callback, after the server answers.
  useEffect(() => {
    const h = to.trim().replace(/^@/, "");
    if (h.length < 2) return;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ recipient: Recipient | null }>(`/api/trade?handle=${encodeURIComponent(h)}`);
        setRecipient(r.recipient);
      } catch {
        setRecipient(null);
      } finally {
        setLooking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [to]);

  async function send() {
    if (!type || !recipient) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/trade", { to: recipient.username, type, qty, idem: idem() });
      sfx.whoosh();
      setTimeout(() => sfx.coin(), 250);
      setStep("done");
      setTimeout(() => fx.burst({ count: 70, power: 12 }), 120);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
      sfx.error();
      setStep("pick");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && type && recipient)
    return (
      <div className="card p-8 text-center anim-rise">
        <div className="mx-auto w-32 anim-pop">
          <FragmentCard type={type} size="sm" />
        </div>
        <div className="display ink-text mt-4 text-4xl text-white">Delivered!</div>
        <p className="mt-1 text-muted">
          {qty} × {FRAGMENT_BY_TYPE[type].name} went to <b className="text-text">@{recipient.username}</b>. It&apos;s in both your histories.
        </p>
        <button
          onClick={() => {
            setStep("pick");
            setQty(1);
          }}
          className="btn btn-ghost mt-5"
        >
          Send another
        </button>
      </div>
    );

  const blocked = !enabled || suspended;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card p-6">
        <div className="display text-2xl">1 · Pick a card</div>
        {owned.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing to send yet. Crack some crates first.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {owned.map((f) => {
              const spare = inventory[f.type] - 1;
              const sel = type === f.type;
              return (
                <li key={f.type}>
                  <button
                    onClick={() => {
                      sfx.click();
                      setType(f.type);
                      setQty(1);
                    }}
                    className={`block w-full rounded-2xl transition ${sel ? "-translate-y-2 rotate-[-2deg] ring-4 ring-accent ring-offset-2 ring-offset-surface" : "hover:-translate-y-1"}`}
                    aria-pressed={sel}
                  >
                    <FragmentCard type={f.type} size="sm" count={inventory[f.type]} />
                  </button>
                  <div className={`display mt-2 text-center text-[10px] tracking-wider ${spare > 0 ? "text-accent" : "text-warn"}`}>{spare > 0 ? `${spare} spare` : "last one"}</div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="display mt-8 text-2xl">2 · Who gets it?</div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input value={to} onChange={(e) => onTo(e.target.value)} placeholder="x username or player code" className="pl-8" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Qty</label>
            <input type="number" min={1} max={Math.max(1, max)} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} className="w-24 tabular-nums" />
          </div>
        </div>
        <div className="mt-3 min-h-[56px]">
          {looking && <div className="text-sm text-muted">Looking…</div>}
          {!looking && to.trim().length >= 2 && !recipient && <div className="text-sm text-error">No player found with that name or code.</div>}
          {recipient && (
            <div className={`flex items-center gap-3 rounded-2xl border p-3 ${recipient.self ? "border-error/40" : "border-accent/40 bg-accent-soft/30"}`}>
              <Avatar src={recipient.avatar} name={recipient.username} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{recipient.displayName}</div>
                <div className="text-xs text-muted">@{recipient.username} · playing since {new Date(recipient.since).toLocaleDateString()}</div>
              </div>
              {recipient.self ? <span className="text-xs text-error">that&apos;s you</span> : <span className="inline-flex items-center gap-1 text-xs text-accent">
                  <TbCheck size={14} strokeWidth={3} /> found
                </span>}
            </div>
          )}
        </div>
      </div>

      <aside className="card p-6">
        <div className="display text-2xl">3 · Confirm</div>
        <div className="mt-4 rounded-2xl border border-border bg-raised/50 p-4 text-sm">
          <div className="flex items-center gap-3">
            {type ? <FragmentIcon type={type} size={44} /> : <div className="h-11 w-11 rounded-xl bg-raised" />}
            <div>
              <div className="font-bold">{type ? `${qty} × ${FRAGMENT_BY_TYPE[type].name}` : "Pick a fragment"}</div>
              <div className="text-muted">to {recipient && !recipient.self ? `@${recipient.username}` : "…"}</div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Transfers are instant, atomic and final. Both players get a history entry. The team can trace every transfer.</p>
        {step === "pick" ? (
          <button onClick={() => (sfx.click(), setStep("confirm"))} disabled={blocked || !type || !recipient || recipient.self || qty < 1 || qty > max} className="btn btn-accent mt-4 w-full">
            {!enabled ? "Trading paused" : "Review transfer"}
          </button>
        ) : (
          <div className="mt-4 flex gap-2">
            <button onClick={send} disabled={busy} className="btn btn-accent flex-1">
              {busy ? "Sending…" : "Send it"}
            </button>
            <button onClick={() => setStep("pick")} disabled={busy} className="btn btn-ghost">
              Back
            </button>
          </div>
        )}
        {error && (
          <div className="mt-3 text-sm text-error" role="alert">
            {error}
          </div>
        )}
      </aside>
    </div>
  );
}
