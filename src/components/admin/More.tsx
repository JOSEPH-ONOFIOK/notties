"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbCheck, TbTrash, TbX } from "react-icons/tb";
import { api } from "@/lib/client";
import { FRAGMENTS, type RecurringEvent } from "@/lib/game/config";

function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function act(body: Record<string, unknown>, ok = "Saved") {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ result: unknown }>("/api/admin", body);
      setMsg({ ok: true, text: ok });
      router.refresh();
      return r.result;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
      return null;
    } finally {
      setBusy(false);
    }
  }
  const Msg = () => (msg ? <span className={`text-xs font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</span> : null);
  return { act, busy, Msg, setMsg };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRESETS: Record<string, { label: string; kind: string; effects: Record<string, unknown> }> = {
  shard_storm: { label: "Shard Storm (Shards ×2, Notebooks ×1.5)", kind: "shard_storm", effects: { drop_mult: { shard: 2, notebook: 1.5 } } },
  double_trouble: { label: "Double Trouble (all TROUBLE rewards ×2)", kind: "double_trouble", effects: { points_mult: 2 } },
  rush_hour: { label: "Rush Hour (crate timers ×0.5)", kind: "rush_hour", effects: { cooldown_mult: 0.5 } },
  goo_rain: { label: "Goo Rain (Goo Vials ×3)", kind: "custom", effects: { drop_mult: { goo: 3 } } },
};

/** Recurring weekly events (UTC). Saved as the whole settings.recurring_events array. */
export function RecurringEditor({ initial }: { initial: RecurringEvent[] }) {
  const { act, busy, Msg } = useAct();
  const [rules, setRules] = useState<RecurringEvent[]>(initial);
  const set = (i: number, patch: Partial<RecurringEvent>) => setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="card p-5">
      <div className="display text-xl">Weekly events (automatic)</div>
      <p className="mt-1 text-xs text-muted">Run on the server&apos;s UTC clock. Everyone gets them at the same moment and drops change the instant they start. Back-to-back days merge into one event.</p>
      <div className="mt-4 space-y-4">
        {rules.map((r, i) => (
          <div key={r.key} className="rounded-xl border-[3px] border-black bg-raised p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input value={r.name} onChange={(e) => set(i, { name: e.target.value })} className="!w-56" aria-label="Event name" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={r.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} className="!min-h-0 !w-4" /> enabled
              </label>
              <span className="text-xs text-muted">{JSON.stringify(r.effects)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {DAYS.map((d, n) => {
                const on = r.days.includes(n);
                return (
                  <button key={d} onClick={() => set(i, { days: on ? r.days.filter((x) => x !== n) : [...r.days, n] })} className={`display rounded-lg border-2 border-black px-2.5 py-1 text-xs ${on ? "bg-accent text-black" : "bg-black/40 text-muted"}`}>
                    {d}
                  </button>
                );
              })}
              <span className="ml-3 text-xs text-muted">from</span>
              <input type="number" min={0} max={23} value={r.start_hour} onChange={(e) => set(i, { start_hour: Number(e.target.value) })} className="!w-20" aria-label="Start hour UTC" />
              <span className="text-xs text-muted">to</span>
              <input type="number" min={1} max={24} value={r.end_hour} onChange={(e) => set(i, { end_hour: Number(e.target.value) })} className="!w-20" aria-label="End hour UTC" />
              <span className="text-xs text-muted">UTC</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-accent text-sm" disabled={busy} onClick={() => act({ action: "setting", key: "recurring_events", value: rules }, "Weekly events saved")}>
          Save weekly events
        </button>
        <Msg />
      </div>
    </div>
  );
}

export function EventForm() {
  const { act, busy, Msg } = useAct();
  const [preset, setPreset] = useState("shard_storm");
  const [name, setName] = useState("Shard Storm");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return (
    <div className="card p-5">
      <div className="display text-xl">Schedule a one-off event</div>
      <p className="mt-1 text-xs text-muted">Times are in your browser&apos;s timezone and stored as UTC.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-muted">Type</span>
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setName(PRESETS[e.target.value].label.split(" (")[0]);
            }}
          >
            {Object.entries(PRESETS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-muted">Name players see</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-xs">
          <span className="text-muted">Starts</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="text-xs">
          <span className="text-muted">Ends</span>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-accent text-sm" disabled={busy || !start || !end} onClick={() => act({ action: "event", name, kind: PRESETS[preset].kind, effects: PRESETS[preset].effects, starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() }, "Event scheduled")}>
          Schedule
        </button>
        <button
          className="btn btn-ghost text-sm"
          disabled={busy}
          onClick={() => {
            const s = new Date();
            const e = new Date(s.getTime() + 3600_000);
            act({ action: "event", name, kind: PRESETS[preset].kind, effects: PRESETS[preset].effects, starts_at: s.toISOString(), ends_at: e.toISOString() }, "Started for 1 hour");
          }}
        >
          Start now for 1h
        </button>
        <Msg />
      </div>
    </div>
  );
}

export function DeleteEvent({ id }: { id: string }) {
  const { act, busy } = useAct();
  return (
    <button className="btn btn-ghost !min-h-[34px] !px-3 text-xs" disabled={busy} onClick={() => confirm("Delete this event?") && act({ action: "event_delete", id })} aria-label="Delete event">
      <TbTrash size={14} />
    </button>
  );
}

export function AdjustForm({ userId }: { userId: string }) {
  const { act, busy, Msg } = useAct();
  const [points, setPoints] = useState("");
  const [type, setType] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="card p-5">
      <div className="display text-xl">Manual correction</div>
      <p className="mt-1 text-xs text-muted">Use negative numbers to take away. Logged with your name and reason.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="± TROUBLE" />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Card…</option>
          {FRAGMENTS.map((f) => (
            <option key={f.type} value={f.type}>
              {f.name}
            </option>
          ))}
        </select>
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="± cards" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn btn-accent text-sm"
          disabled={busy || !reason.trim() || (!points && !(type && qty))}
          onClick={async () => {
            const r = await act({ action: "adjust", userId, points: Number(points) || 0, type: type || undefined, qty: Number(qty) || 0, reason }, "Applied");
            if (r !== null) {
              setPoints("");
              setQty("");
              setReason("");
            }
          }}
        >
          Apply
        </button>
        <Msg />
      </div>
    </div>
  );
}

export function ReviewButtons({ id }: { id: string }) {
  const { act, busy } = useAct();
  return (
    <div className="flex gap-1.5">
      <button className="btn btn-accent !min-h-[34px] !px-3 text-xs" disabled={busy} onClick={() => act({ action: "review", id, approve: true })} aria-label="Approve">
        <TbCheck size={15} />
      </button>
      <button className="btn btn-ghost !min-h-[34px] !px-3 text-xs" disabled={busy} onClick={() => act({ action: "review", id, approve: false })} aria-label="Reject">
        <TbX size={15} />
      </button>
    </div>
  );
}

export function AllowlistForm() {
  const { act, busy, Msg, setMsg } = useAct();
  const [lines, setLines] = useState("");
  const [category, setCategory] = useState("");
  const [phase, setPhase] = useState(2);
  const [allocation, setAllocation] = useState(1);
  return (
    <div className="card p-5">
      <div className="display text-xl">Add wallets</div>
      <p className="mt-1 text-xs text-muted">One per line. Optionally add phase and allocation per line: <code>0xabc…,2,1</code>. Partners, communities, manual approvals.</p>
      <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={6} className="mt-3 font-mono text-xs" placeholder={"0x1234…\n0xabcd…,2,3"} />
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. partner-dao)" />
        <label className="flex items-center gap-2 text-xs text-muted">
          Phase <input type="number" min={1} max={9} value={phase} onChange={(e) => setPhase(Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          Alloc <input type="number" min={1} max={50} value={allocation} onChange={(e) => setAllocation(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn btn-accent text-sm"
          disabled={busy || !lines.trim() || !category.trim()}
          onClick={async () => {
            const r = (await act({ action: "allowlist_add", lines, category, phase, allocation }, "Added")) as { added: number; bad: string[] } | null;
            if (r) {
              setMsg({ ok: !r.bad.length, text: `Added ${r.added}${r.bad.length ? `, skipped ${r.bad.length} invalid` : ""}` });
              if (!r.bad.length) setLines("");
            }
          }}
        >
          Add to allowlist
        </button>
        <Msg />
      </div>
    </div>
  );
}

export function RemoveAllowlist({ id }: { id: string }) {
  const { act, busy } = useAct();
  return (
    <button className="text-muted hover:text-error" disabled={busy} onClick={() => act({ action: "allowlist_remove", id })} aria-label="Remove">
      <TbTrash size={14} />
    </button>
  );
}

export function SnapshotForm() {
  const { act, busy, Msg } = useAct();
  const [label, setLabel] = useState("");
  const [close, setClose] = useState(false);
  return (
    <div className="card p-5">
      <div className="display text-xl">Freeze a snapshot</div>
      <p className="mt-1 text-xs text-muted">Copies everyone eligible right now into a fixed list and builds one Merkle root per phase. Proofs are served from the latest snapshot at /api/proof?address=0x…</p>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Final GTD)" className="mt-3" />
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} className="!min-h-0 !w-4" /> Also close the Forge (no new GTD after this)
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn btn-accent text-sm" disabled={busy} onClick={() => confirm("Freeze the snapshot now?") && act({ action: "snapshot", label, closeForge: close }, "Snapshot frozen")}>
          Freeze snapshot
        </button>
        <Msg />
      </div>
    </div>
  );
}

export function ProofLookup() {
  const [addr, setAddr] = useState("");
  const [out, setOut] = useState<string | null>(null);
  return (
    <div className="card p-5">
      <div className="display text-xl">Check a wallet</div>
      <div className="mt-3 flex gap-2">
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" className="font-mono text-xs" />
        <button
          className="btn btn-ghost text-sm"
          onClick={async () => {
            const r = await fetch(`/api/proof?address=${encodeURIComponent(addr.trim())}`).then((x) => x.json());
            setOut(JSON.stringify(r, null, 2));
          }}
        >
          Look up
        </button>
      </div>
      {out && <pre className="mt-3 max-h-64 overflow-auto rounded-xl border-2 border-black bg-black/50 p-3 text-[11px] text-muted">{out}</pre>}
    </div>
  );
}

export function RoleForm() {
  const { act, busy, Msg } = useAct();
  const [u, setU] = useState("");
  const [role, setRole] = useState("moderator");
  return (
    <div className="card p-5">
      <div className="display text-xl">Add a team member</div>
      <p className="mt-1 text-xs text-muted">They sign in with X (verified accounts only; guest names never count).</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="@xhandle" className="!w-56" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="!w-40">
          <option value="viewer">viewer</option>
          <option value="moderator">moderator</option>
          <option value="owner">owner</option>
        </select>
        <button className="btn btn-accent text-sm" disabled={busy || !u.trim()} onClick={() => act({ action: "role", username: u, role }, "Saved").then(() => setU(""))}>
          Save
        </button>
        <Msg />
      </div>
    </div>
  );
}

export function RemoveRole({ username }: { username: string }) {
  const { act, busy } = useAct();
  return (
    <button className="btn btn-ghost !min-h-[34px] !px-3 text-xs" disabled={busy} onClick={() => confirm(`Remove @${username}?`) && act({ action: "role", username, role: null })}>
      Remove
    </button>
  );
}

export function TextSetting({ k, label, value, hint, parse }: { k: string; label: string; value: string; hint?: string; parse: "numbers" | "mint" }) {
  const { act, busy, Msg } = useAct();
  const [v, setV] = useState(value);
  return (
    <div className="rounded-xl border-[3px] border-black bg-raised/40 p-4">
      <label className="block text-sm font-bold">{label}</label>
      {hint && <div className="text-xs text-muted">{hint}</div>}
      <div className="mt-2 flex gap-2">
        <input value={v} onChange={(e) => setV(e.target.value)} />
        <button
          className="btn btn-ghost text-sm"
          disabled={busy}
          onClick={() => {
            const value = parse === "numbers" ? v.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => n >= 0) : v;
            act({ action: "setting", key: k, value });
          }}
        >
          Save
        </button>
      </div>
      <Msg />
    </div>
  );
}

export function MintSetting({ value }: { value: { date: string; chain: string; price: string } }) {
  const { act, busy, Msg } = useAct();
  const [m, setM] = useState(value);
  return (
    <div className="rounded-xl border-[3px] border-black bg-raised/40 p-4">
      <label className="block text-sm font-bold">Mint details</label>
      <div className="text-xs text-muted">Once a date is set, players see a countdown in the city. Leave blank until announced.</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input type="datetime-local" value={m.date ? new Date(m.date).toISOString().slice(0, 16) : ""} onChange={(e) => setM({ ...m, date: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
        <input value={m.chain} onChange={(e) => setM({ ...m, chain: e.target.value })} placeholder="Chain" />
        <input value={m.price} onChange={(e) => setM({ ...m, price: e.target.value })} placeholder="Price" />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button className="btn btn-ghost text-sm" disabled={busy} onClick={() => act({ action: "setting", key: "mint", value: m })}>
          Save
        </button>
        <Msg />
      </div>
    </div>
  );
}
