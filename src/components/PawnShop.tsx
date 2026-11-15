"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, idem } from "@/lib/client";
import { FRAGMENTS, POINTS_NAME, type FragmentType } from "@/lib/game/config";
import { FragmentIcon } from "./FragmentIcon";
import { RarityPill } from "./ui";
import { Coin } from "./game/Coin";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";

export function PawnShop({ inventory, prices, enabled, suspended }: { inventory: Record<FragmentType, number>; prices: Record<FragmentType, number>; enabled: boolean; suspended: boolean }) {
  const router = useRouter();
  const [qty, setQty] = useState<Partial<Record<FragmentType, number>>>({});
  const [busy, setBusy] = useState<FragmentType | null>(null);
  const [msg, setMsg] = useState<{ type: FragmentType; ok: boolean; text: string } | null>(null);
  const btns = useRef<Partial<Record<FragmentType, HTMLButtonElement | null>>>({});
  const sellable = FRAGMENTS.map((f) => ({ ...f, have: inventory[f.type], spare: Math.max(0, inventory[f.type] - 1) }));
  const anySpare = sellable.some((s) => s.spare > 0);

  async function sell(type: FragmentType, n: number) {
    setBusy(type);
    setMsg(null);
    try {
      const { result } = await api<{ result: { points: number } }>("/api/pawn", { type, qty: n, idem: idem() });
      setMsg({ type, ok: true, text: `+${result.points} ${POINTS_NAME}` });
      sfx.coin();
      fx.float(`+${result.points}`, { at: btns.current[type] });
      fx.burst({ at: btns.current[type], count: 24, power: 8, colors: ["#cdff00", "#ffd166"] });
      setQty((q) => ({ ...q, [type]: 1 }));
      router.refresh();
    } catch (e) {
      setMsg({ type, ok: false, text: e instanceof Error ? e.message : "Failed" });
      sfx.error();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="display flex items-center gap-2 text-2xl">
            <Coin size={28} /> The Pawn Shop
          </div>
          <p className="mt-1 text-sm text-muted">Hood buys spares for {POINTS_NAME}. House rule: you always keep one of each, so you can still assemble.</p>
        </div>
        {!enabled && <span className="text-sm text-warn">Shut for now</span>}
      </div>
      {!anySpare ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">No spares to sell. Only duplicates beyond your first copy can be pawned.</p>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {sellable
            .filter((s) => s.spare > 0)
            .map((s) => {
              const n = Math.min(s.spare, Math.max(1, qty[s.type] ?? 1));
              return (
                <li key={s.type} className="flex flex-wrap items-center gap-3 py-3">
                  <FragmentIcon type={s.type} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{s.name}</span>
                      <RarityPill rarity={s.rarity} />
                    </div>
                    <div className="text-xs text-muted">
                      own {s.have} · {s.spare} sellable · <span className="text-accent">{prices[s.type]}</span> TROUBLE each
                    </div>
                  </div>
                  <input type="number" min={1} max={s.spare} value={n} onChange={(e) => setQty((q) => ({ ...q, [s.type]: Number(e.target.value) || 1 }))} className="w-20 tabular-nums" aria-label={`Quantity of ${s.name} to sell`} />
                  <button ref={(el) => void (btns.current[s.type] = el)} onClick={() => sell(s.type, n)} disabled={!enabled || suspended || busy === s.type} className="btn btn-ghost text-sm">
                    {busy === s.type ? "Selling…" : `Sell for ${prices[s.type] * n}`}
                  </button>
                  {msg?.type === s.type && <span className={`w-full text-sm sm:w-auto ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</span>}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
