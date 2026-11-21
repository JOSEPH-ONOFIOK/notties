import { TbArrowLeft, TbArrowRight } from "react-icons/tb";
import { FragmentIcon } from "@/components/FragmentIcon";
import { TradeForm } from "@/components/TradeForm";
import { PageTitle, fmtDateTime } from "@/components/ui";
import { FRAGMENT_BY_TYPE } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { tradeHistory } from "@/lib/game/trade";
import { listOffers } from "@/lib/game/offers";
import { SwapBoard } from "@/components/SwapBoard";
import Link from "next/link";
import { currentPlayer } from "@/lib/player";
import { MarketShop } from "@/components/game/MarketShop";
import { listMarket } from "@/lib/game/p2p";

export const metadata = { title: "Market" };

export default async function Trade({ searchParams }: { searchParams: Promise<{ to?: string; tab?: string; type?: string }> }) {
  const [p, sp] = await Promise.all([currentPlayer(), searchParams]);
  const [s, history, offers, listings] = await Promise.all([getSettings(), tradeHistory(p.id, 25), listOffers(p.id), listMarket(p.id)]);
  const tab = sp.tab === "gift" ? "gift" : sp.tab === "swap" ? "swap" : "shop";
  return (
    <>
      <PageTitle kicker="Market" title="The Market" sub="Buy crates, buy and sell parts with other players, swap your doubles, or gift a card to a friend." />
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["shop", "Shop"],
          ["swap", `Swap board${offers.open.length ? ` (${offers.open.length})` : ""}`],
          ["gift", "Gift a card"],
        ].map(([k, label]) => (
          <Link key={k} href={`/trade?tab=${k}`} className={`display rounded-full border-[3px] border-black px-4 py-2 text-sm tracking-wider shadow-[0_3px_0_#000] transition hover:-translate-y-0.5 ${tab === k ? "bg-accent text-black" : "bg-raised text-muted"}`}>
            {label}
          </Link>
        ))}
      </div>
      {tab === "shop" ? (
        <MarketShop cratePrice={s.crate_price} points={p.points} inventory={p.inventory} enabled={s.market_enabled} suspended={p.accountStatus !== "active"} crates={p.crates} listings={listings} />
      ) : tab === "swap" ? (
        <SwapBoard inventory={p.inventory} open={offers.open} mine={offers.mine} enabled={s.trade_enabled} suspended={p.accountStatus !== "active"} />
      ) : (
        <TradeForm inventory={p.inventory} enabled={s.trade_enabled} suspended={p.accountStatus !== "active"} initialTo={sp.to} initialType={sp.type} />
      )}

      <div className="card mt-6 p-6">
        <div className="display text-2xl">Transfer history</div>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No transfers yet. Your player code is <b className="text-text">{p.refCode}</b>. Give it to whoever is sending you something.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                <FragmentIcon type={h.type} size={28} />
                <div className="min-w-0 flex-1">
                  <span className="font-bold">
                    {h.qty} × {FRAGMENT_BY_TYPE[h.type]?.name ?? h.type}
                  </span>{" "}
                  <span className="inline-flex items-center gap-1 text-muted">
                    {h.direction === "out" ? <TbArrowRight size={14} /> : <TbArrowLeft size={14} />} @{h.other}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${h.direction === "in" ? "bg-accent-soft text-accent" : "bg-raised text-muted"}`}>{h.direction === "in" ? "received" : "sent"}</span>
                <span className="hidden text-xs text-muted sm:inline">{fmtDateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
