"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbBox, TbShoppingCart } from "react-icons/tb";
import { api, idem } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { PARTS, RARITY_COLOR, RARITY_LABEL, type FragmentType } from "@/lib/game/config";
import { FragmentIcon } from "../FragmentIcon";
import { Coin } from "./Coin";

/** Buy crates (opened on the Hunt page) or any part outright. */
export function MarketShop({ prices, cratePrice, points, inventory, enabled, suspended, crates }: { prices: Record<FragmentType, number>; cratePrice: number; points: number; inventory: Record<FragmentType, number>; enabled: boolean; suspended: boolean; crates: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<FragmentType | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [crateConfirm, setCrateConfirm] = useState<number | null>(null);

  async function buyCrates(qty: number, el: HTMLButtonElement) {
    setBusy(true);
    setMsg(null);
    try {
      const { result } = await api<{ result: { crates: number } }>("/api/market", { type: "crate", qty, idem: idem() });
      sfx.coin();
      fx.burst({ at: el, count: 50, power: 10, colors: ["#cdff00", "#ffffff", "#ffd166"] });
      setMsg({ ok: true, text: `Bought ${qty} crate${qty === 1 ? "" : "s"}. You have ${result.crates}. Open them on the Hunt page.` });
      setCrateConfirm(null);
      router.refresh();
    } catch (e) {
      sfx.error();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't buy" });
    } finally {
      setBusy(false);
    }
  }
  const items = PARTS.filter((f) => (prices[f.type] ?? 0) > 0).sort((a, b) => prices[a.type] - prices[b.type]);

  async function buy(type: FragmentType, el: HTMLButtonElement) {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/market", { type, qty: 1, idem: idem() });
      sfx.coin();
      fx.burst({ at: el, count: 50, power: 10, colors: [RARITY_COLOR[PARTS.find((p) => p.type === type)!.rarity], "#ffffff", "#cdff00"] });
      setMsg({ ok: true, text: `Bought 1 × ${PARTS.find((p) => p.type === type)?.name}. It's in your stash.` });
      setConfirm(null);
      router.refresh();
    } catch (e) {
      sfx.error();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't buy" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          Your balance:
          <span className="display flex items-center gap-1 text-xl text-accent">
            <Coin size={22} /> {points.toLocaleString()}
          </span>
        </div>
        <Link href="/tasks" className="btn btn-ghost !min-h-[40px] text-sm">
          <Coin size={16} /> Earn more
        </Link>
      </div>

      <div className="card card-lime p-4 text-black sm:p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-black text-accent">
            <TbBox size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="display text-xl leading-tight">Mystery crate</div>
            <div className="text-sm font-semibold text-black/70">One random part each. Could be a Body.</div>
          </div>
          <span className="display flex shrink-0 items-center gap-1 rounded-full border-[3px] border-black bg-black px-3 py-1 text-accent">
            <Coin size={18} /> {cratePrice.toLocaleString()}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {crateConfirm ? (
            <>
              <span className="text-sm font-bold">
                Buy {crateConfirm} for {(crateConfirm * cratePrice).toLocaleString()} $NOTTIES?
              </span>
              <button onClick={(e) => buyCrates(crateConfirm, e.currentTarget)} disabled={busy} className="btn border-black bg-black !min-h-[40px] text-sm text-accent">
                {busy ? "…" : "Confirm"}
              </button>
              <button onClick={() => setCrateConfirm(null)} className="btn btn-ghost !min-h-[40px] text-sm">
                Cancel
              </button>
            </>
          ) : (
            [1, 5, 10].map((n) => (
              <button key={n} onClick={() => (setMsg(null), setCrateConfirm(n))} disabled={!enabled || suspended || points < n * cratePrice} className="btn border-black bg-black !min-h-[40px] text-sm text-accent">
                Buy {n}
              </button>
            ))
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
          <span>
            You have {crates} crate{crates === 1 ? "" : "s"}
          </span>
          {crates > 0 && (
            <Link href="/hunt" className="underline">
              Open them on Hunt →
            </Link>
          )}
          {points < cratePrice && (
            <Link href="/tasks" className="underline">
              Not enough $NOTTIES? Complete missions →
            </Link>
          )}
        </div>
      </div>

      {!enabled && <div className="card p-4 text-sm text-warn">The Market is closed right now.</div>}
      {msg && <div className={`text-sm font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</div>}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((f) => {
          const price = prices[f.type];
          const afford = points >= price;
          const c = RARITY_COLOR[f.rarity];
          return (
            <li key={f.type} className="card flex flex-col p-3" style={{ borderColor: "#000" }}>
              <div className="flex items-center justify-between">
                <span className="display rounded-full border-2 border-black px-1.5 py-px text-[9px] text-black" style={{ background: c }}>
                  {RARITY_LABEL[f.rarity]}
                </span>
                <span className="text-[11px] text-muted">own {inventory[f.type] ?? 0}</span>
              </div>
              <div className="my-2 grid place-items-center rounded-xl border-2 border-black py-3" style={{ background: `radial-gradient(circle, ${c}33, #0e100a 70%)` }}>
                <FragmentIcon type={f.type} size={56} />
              </div>
              <div className="display truncate">{f.name}</div>
              <div className="display mb-2 flex items-center gap-1 text-lg text-accent">
                <Coin size={18} /> {price.toLocaleString()}
              </div>
              {confirm === f.type ? (
                <div className="mt-auto flex gap-1.5">
                  <button onClick={(e) => buy(f.type, e.currentTarget)} disabled={busy} className="btn btn-accent !min-h-[38px] flex-1 !px-2 text-xs">
                    {busy ? "…" : "Confirm"}
                  </button>
                  <button onClick={() => setConfirm(null)} className="btn btn-ghost !min-h-[38px] !px-2 text-xs">
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => (setMsg(null), setConfirm(f.type))} disabled={!enabled || suspended || !afford} className="btn btn-ghost mt-auto !min-h-[38px] text-xs" title={!afford ? `You need ${price.toLocaleString()} $NOTTIES` : undefined}>
                  <TbShoppingCart size={15} /> {afford ? "Buy" : `Need ${(price - points).toLocaleString()}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">Prices are set by the team. Trading with other players is usually cheaper, especially for the rare ones.</p>
    </div>
  );
}
