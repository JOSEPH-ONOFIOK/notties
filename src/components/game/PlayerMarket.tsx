"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbShoppingCart, TbTag, TbX } from "react-icons/tb";
import { api, idem } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { FRAGMENT_BY_TYPE, PARTS, RARITY_COLOR, type FragmentType } from "@/lib/game/config";
import type { Listing } from "@/lib/game/p2p";
import { FragmentIcon } from "../FragmentIcon";
import { Coin } from "./Coin";

/**
 * Player-to-player market. "For sale" = cards players listed (buy them). "Wanted" = $NOTTIES
 * offers for a card (sell yours into them). Players post either from the form at the top.
 */
export function PlayerMarket({ listings, inventory, points, enabled, suspended }: { listings: Listing[]; inventory: Record<FragmentType, number>; points: number; enabled: boolean; suspended: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"sell" | "buy">("sell");
  const [type, setType] = useState<FragmentType>(PARTS[0].type);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<FragmentType | "all">("all");

  const sale = listings.filter((l) => l.kind === "sell" && (filter === "all" || l.type === filter));
  const wanted = listings.filter((l) => l.kind === "buy" && (filter === "all" || l.type === filter)).sort((a, b) => b.price - a.price);
  const n = Math.floor(Number(price));
  const canPost = enabled && !suspended && n > 0 && (kind === "sell" ? (inventory[type] ?? 0) > 0 : points >= n);

  async function run(key: string, body: Record<string, unknown>, ok: string, el?: HTMLElement | null) {
    setBusy(key);
    setMsg(null);
    try {
      await api("/api/market", body);
      sfx.coin();
      if (el) fx.burst({ at: el, count: 40, power: 9, colors: ["#cdff00", "#ffffff"] });
      setMsg({ ok: true, text: ok });
      setConfirm(null);
      router.refresh();
      return true;
    } catch (e) {
      sfx.error();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const row = (l: Listing) => {
    const def = FRAGMENT_BY_TYPE[l.type];
    const isSale = l.kind === "sell";
    const can = isSale ? points >= l.price : (inventory[l.type] ?? 0) > 0;
    return (
      <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-black" style={{ background: `radial-gradient(circle, ${RARITY_COLOR[def.rarity]}44, #0e100a 75%)` }}>
          <FragmentIcon type={l.type} size={32} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="display truncate text-sm">{def.name}</div>
          <div className="truncate text-xs text-muted">{l.mine ? "Your listing" : `@${l.user}`}</div>
        </div>
        <span className="display flex shrink-0 items-center gap-1 text-accent">
          <Coin size={16} /> {l.price.toLocaleString()}
        </span>
        {l.mine ? (
          <button onClick={() => run(l.id, { action: "cancel", id: l.id }, "Listing cancelled. Your card or $NOTTIES are back.")} disabled={busy === l.id} className="btn btn-ghost shrink-0 !min-h-[34px] !px-2.5 text-xs" aria-label="Cancel listing">
            <TbX size={14} />
          </button>
        ) : confirm === l.id ? (
          <button onClick={(e) => run(l.id, { action: "fill", id: l.id }, isSale ? `Bought a ${def.name}. It's in your stash.` : `Sold your ${def.name} for ${l.price.toLocaleString()} $NOTTIES.`, e.currentTarget)} disabled={busy === l.id} className="btn btn-accent shrink-0 !min-h-[34px] !px-3 text-xs">
            {busy === l.id ? "…" : "Confirm"}
          </button>
        ) : (
          <button onClick={() => (setMsg(null), setConfirm(l.id))} disabled={!enabled || suspended || !can} className="btn btn-accent shrink-0 !min-h-[34px] !px-3 text-xs" title={!can ? (isSale ? "Not enough $NOTTIES" : `You don't have a ${def.name}`) : undefined}>
            {isSale ? "Buy" : "Sell"}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {/* post */}
      <div className="card p-4 sm:p-5">
        <div className="display text-xl">Trade with players</div>
        <p className="mt-1 text-sm text-muted">Parts aren&apos;t sold by the team. List a card for sale, or offer $NOTTIES for one you need. Your card or $NOTTIES are held safely until someone takes the deal.</p>
        <div className="mt-3 flex gap-2">
          {(
            [
              ["sell", "Sell a card", TbTag],
              ["buy", "Make an offer", TbShoppingCart],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setKind(k)} className={`display flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-1.5 text-xs tracking-wider ${kind === k ? "bg-accent text-black" : "bg-raised text-muted"}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <select value={type} onChange={(e) => setType(e.target.value as FragmentType)} aria-label="Card">
            {PARTS.map((f) => (
              <option key={f.type} value={f.type}>
                {f.name}
                {kind === "sell" ? ` (you have ${inventory[f.type] ?? 0})` : ""}
              </option>
            ))}
          </select>
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Price ($NOTTIES)" aria-label="Price" />
          <button onClick={async () => (await run("post", { action: "list", kind, type, price: n, idem: idem() }, kind === "sell" ? "Listed. You'll get mail when it sells." : "Offer posted. You'll get mail when someone sells to you.")) && setPrice("")} disabled={!canPost || busy === "post"} className="btn btn-accent text-sm">
            {busy === "post" ? "…" : kind === "sell" ? "List for sale" : "Post offer"}
          </button>
        </div>
        {kind === "sell" && (inventory[type] ?? 0) === 0 && <div className="mt-2 text-xs text-warn">You don&apos;t have a {FRAGMENT_BY_TYPE[type].name} to sell.</div>}
        {kind === "buy" && n > points && <div className="mt-2 text-xs text-warn">You only have {points.toLocaleString()} $NOTTIES.</div>}
        {msg && <div className={`mt-2 text-sm font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</div>}
      </div>

      {/* filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...PARTS.map((f) => f.type)] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`display shrink-0 rounded-full border-2 border-black px-3 py-1 text-xs ${filter === t ? "bg-accent text-black" : "bg-raised text-muted"}`}>
            {t === "all" ? "All" : FRAGMENT_BY_TYPE[t].name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <h3 className="display mb-2 text-lg">
            For sale <span className="text-muted">({sale.length})</span>
          </h3>
          {sale.length ? <ul className="card max-h-[360px] divide-y-2 divide-black/60 overflow-y-auto overscroll-contain p-0 sm:max-h-[440px]">{sale.map(row)}</ul> : <p className="card p-4 text-sm text-muted">Nothing listed yet. Be the first to sell a spare.</p>}
        </section>
        <section>
          <h3 className="display mb-2 text-lg">
            Wanted <span className="text-muted">({wanted.length})</span>
          </h3>
          {wanted.length ? <ul className="card max-h-[360px] divide-y-2 divide-black/60 overflow-y-auto overscroll-contain p-0 sm:max-h-[440px]">{wanted.map(row)}</ul> : <p className="card p-4 text-sm text-muted">No offers yet. Post one for the part you need.</p>}
        </section>
      </div>
    </div>
  );
}
