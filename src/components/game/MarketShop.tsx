"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbBox } from "react-icons/tb";
import { api, idem } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { type FragmentType } from "@/lib/game/config";
import type { Listing } from "@/lib/game/p2p";
import { PlayerMarket } from "./PlayerMarket";
import { Coin } from "./Coin";

/** Buy crates from the house (opened on Hunt). Parts are traded between players below. */
export function MarketShop({ cratePrice, points, inventory, enabled, suspended, crates, listings }: { cratePrice: number; points: number; inventory: Record<FragmentType, number>; enabled: boolean; suspended: boolean; crates: number; listings: Listing[] }) {
  const router = useRouter();
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
            [1].map((n) => (
              <button key={n} onClick={() => (setMsg(null), setCrateConfirm(n))} disabled={!enabled || suspended || points < n * cratePrice} className="btn border-black bg-black !min-h-[40px] text-sm text-accent">
                Buy 1 crate
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

      <PlayerMarket listings={listings} inventory={inventory} points={points} enabled={enabled} suspended={suspended} />
    </div>
  );
}
