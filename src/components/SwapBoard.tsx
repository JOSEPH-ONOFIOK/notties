"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbArrowRight, TbLock, TbPlus, TbTrash } from "react-icons/tb";
import { api, idem } from "@/lib/client";
import { FRAGMENTS, FRAGMENT_BY_TYPE, type FragmentType } from "@/lib/game/config";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { FragmentIcon } from "./FragmentIcon";
import { FragmentCard } from "./game/FragmentCard";
import { Avatar } from "./Nav";

type Offer = { id: string; maker: string; maker_avatar: string | null; give_type: FragmentType; give_qty: number; want_type: FragmentType; want_qty: number; target: string | null; created_at: string };

export function SwapBoard({ inventory, open, mine, enabled, suspended }: { inventory: Record<FragmentType, number>; open: Offer[]; mine: Offer[]; enabled: boolean; suspended: boolean }) {
  const router = useRouter();
  const owned = FRAGMENTS.filter((f) => inventory[f.type] > 0);
  const [give, setGive] = useState<FragmentType | "">(owned[0]?.type ?? "");
  const [giveQty, setGiveQty] = useState(1);
  const [want, setWant] = useState<FragmentType | "">("");
  const [wantQty, setWantQty] = useState(1);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "can">("can");
  const blocked = !enabled || suspended;

  async function run(key: string, body: Record<string, unknown>, okText: string, party = false) {
    setBusy(key);
    setMsg(null);
    try {
      await api("/api/offers", body);
      sfx.coin();
      if (party) {
        sfx.whoosh();
        fx.burst({ count: 80, power: 12, colors: ["#8ad7ff", "#cdff00", "#fff"] });
      }
      setMsg({ ok: true, text: okText });
      router.refresh();
    } catch (e) {
      sfx.error();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  }

  const can = (o: Offer) => inventory[o.want_type] >= o.want_qty;
  const list = filter === "can" ? open.filter(can) : open;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-2xl">Open offers</h2>
          <div className="flex gap-1 rounded-full border-[3px] border-black bg-black/40 p-1">
            {(["can", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`display rounded-full px-3 py-1 text-xs ${filter === f ? "bg-accent text-black" : "text-muted"}`}>
                {f === "can" ? "I can fill" : "All"}
              </button>
            ))}
          </div>
        </div>
        {msg && <div className={`mt-3 text-sm font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</div>}
        {list.length === 0 ? (
          <p className="mt-6 rounded-2xl border-[3px] border-dashed border-black/60 p-6 text-center text-sm text-muted">{open.length ? "Nothing you can fill right now. Switch to All to see every offer." : "No offers yet. Post the first one."}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {list.map((o) => {
              const ok = can(o);
              return (
                <li key={o.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border-[3px] border-black p-3 shadow-[0_4px_0_#000] ${o.target ? "bg-[#1f2a10]" : "bg-raised"}`}>
                  <Avatar src={o.maker_avatar} name={o.maker} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="display truncate text-sm">@{o.maker}</div>
                    {o.target && <div className="text-[11px] text-accent">Reserved for you</div>}
                  </div>
                  <Pair type={o.want_type} qty={o.want_qty} label="You give" />
                  <TbArrowRight size={20} className="text-muted" />
                  <Pair type={o.give_type} qty={o.give_qty} label="You get" />
                  <button onClick={() => run(`fill-${o.id}`, { action: "fill", id: o.id }, `Swapped! ${FRAGMENT_BY_TYPE[o.give_type].name} is yours.`, true)} disabled={blocked || !ok || busy !== null} className="btn btn-accent !min-h-[42px] !px-4 text-sm" title={ok ? undefined : `You need ${o.want_qty} × ${FRAGMENT_BY_TYPE[o.want_type].name}`}>
                    {busy === `fill-${o.id}` ? "Swapping…" : ok ? "Swap" : <TbLock size={16} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {mine.length > 0 && (
          <>
            <h3 className="display mt-8 text-xl">Your offers</h3>
            <p className="text-xs text-muted">Cards you&apos;re offering are held safely until someone takes the deal or you cancel.</p>
            <ul className="mt-3 space-y-2">
              {mine.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-2xl border-[3px] border-black bg-black/30 p-3">
                  <Pair type={o.give_type} qty={o.give_qty} label="Giving" />
                  <TbArrowRight size={18} className="text-muted" />
                  <Pair type={o.want_type} qty={o.want_qty} label="Want" />
                  <span className="ml-auto text-xs text-muted">{o.target ? `for @${o.target}` : "anyone"}</span>
                  <button onClick={() => run(`cancel-${o.id}`, { action: "cancel", id: o.id }, "Offer cancelled. Card returned.")} disabled={busy !== null} className="btn btn-ghost !min-h-[38px] !px-3 text-xs" aria-label="Cancel offer">
                    <TbTrash size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <aside className="card h-fit p-5 sm:p-6">
        <h2 className="display text-2xl">Post an offer</h2>
        <p className="mt-1 text-xs text-muted">Your card is held until someone takes it. Up to 5 open offers.</p>
        {owned.length === 0 ? (
          <p className="mt-4 text-sm text-muted">You need a card to offer. Crack a crate first.</p>
        ) : (
          <>
            <label className="display mt-4 block text-xs tracking-widest text-muted">You give</label>
            <div className="mt-1 flex gap-2">
              <select value={give} onChange={(e) => setGive(e.target.value as FragmentType)}>
                {owned.map((f) => (
                  <option key={f.type} value={f.type}>
                    {f.name} (have {inventory[f.type]})
                  </option>
                ))}
              </select>
              <input type="number" min={1} max={give ? inventory[give] : 1} value={giveQty} onChange={(e) => setGiveQty(Math.max(1, Number(e.target.value) || 1))} className="!w-20" aria-label="Give quantity" />
            </div>
            <label className="display mt-4 block text-xs tracking-widest text-muted">You want</label>
            <div className="mt-1 flex gap-2">
              <select value={want} onChange={(e) => setWant(e.target.value as FragmentType)}>
                <option value="">Pick a card…</option>
                {FRAGMENTS.filter((f) => f.type !== give).map((f) => (
                  <option key={f.type} value={f.type}>
                    {f.name}
                    {inventory[f.type] === 0 ? " (missing)" : ""}
                  </option>
                ))}
              </select>
              <input type="number" min={1} max={20} value={wantQty} onChange={(e) => setWantQty(Math.max(1, Number(e.target.value) || 1))} className="!w-20" aria-label="Want quantity" />
            </div>
            <label className="display mt-4 block text-xs tracking-widest text-muted">Only for (optional)</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@username or code" className="mt-1" autoCapitalize="off" spellCheck={false} />
            {give && want && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="w-20">
                  <FragmentCard type={give} size="sm" count={giveQty} />
                </div>
                <TbArrowRight size={22} className="text-accent" />
                <div className="w-20">
                  <FragmentCard type={want} size="sm" count={wantQty} />
                </div>
              </div>
            )}
            <button
              onClick={() => give && want && run("create", { action: "create", give, giveQty, want, wantQty, to: to || undefined, idem: idem() }, "Offer posted. Your card is held until someone takes it.")}
              disabled={blocked || !give || !want || busy !== null || giveQty > (give ? inventory[give] : 0)}
              className="btn btn-accent mt-4 w-full"
            >
              <TbPlus size={18} /> {busy === "create" ? "Posting…" : "Post offer"}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

function Pair({ type, qty, label }: { type: FragmentType; qty: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-black bg-black/50">
        <FragmentIcon type={type} size={28} />
      </span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className="display text-xs">
          {qty}× {FRAGMENT_BY_TYPE[type].name}
        </div>
      </div>
    </div>
  );
}
