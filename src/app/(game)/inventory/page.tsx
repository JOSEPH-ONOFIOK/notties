import { FragmentIcon } from "@/components/FragmentIcon";
import Link from "next/link";
import { TbArrowsExchange, TbGift } from "react-icons/tb";
import { FragmentCard } from "@/components/game/FragmentCard";
import { PageTitle, Points, ProgressBar, fmtDateTime } from "@/components/ui";
import { FRAGMENTS, FRAGMENT_BY_TYPE, PARTS, type FragmentType } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { query } from "@/lib/db";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Stash" };

const REASON: Record<string, string> = { crate: "Crate", shop_crate: "Bought crate", free_crate: "Free crate", trade_in: "Received", trade_out: "Sent", swap_in: "Swap", swap_out: "Swap", escrow: "Swap offer", escrow_return: "Offer cancelled", forge: "Assembled", pawn: "Pawned", admin: "Gift" };

export default async function Inventory() {
  const p = await currentPlayer();
  const [s, ledger] = await Promise.all([
    getSettings(),
    query<{ type: FragmentType; delta: number; reason: string; created_at: string }>("select type, delta, reason, created_at from fragment_ledger where user_id = $1 order by id desc limit 30", [p.id]),
  ]);
  const found = PARTS.filter((f) => p.inventory[f.type] > 0).length;
  // Vlad's Book only shows once you actually hold one.
  const cards = FRAGMENTS.filter((f) => !f.special || p.inventory[f.type] > 0);
  const spares = PARTS.map((f) => ({ f, n: Math.max(0, p.inventory[f.type] - (s.recipe[f.type] ?? 1)) })).filter((x) => x.n > 0);
  const missing = PARTS.filter((f) => p.inventory[f.type] === 0);

  return (
    <>
      <PageTitle kicker="Stash" title="Card collection" sub={`${found}/8 fragment types found · ${p.fragments} cards total.`} right={<Points n={p.points} size="lg" />} />
      <ProgressBar pct={Math.round((found / 8) * 100)} tall className="mb-8" />

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((f) => {
          const n = p.inventory[f.type];
          return (
            <li key={f.type} className="transition hover:-translate-y-1 hover:rotate-1">
              <FragmentCard type={f.type} count={n} locked={n === 0} blurb />
              {n === 0 && <div className="mt-2 text-center text-xs text-muted">Not found yet · {f.weight}% drop</div>}
              {n > 1 && <div className="mt-2 text-center text-xs text-accent">{n - (s.recipe[f.type] ?? 1)} spare</div>}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card p-5 sm:p-6">
          <div className="display flex items-center gap-2 text-2xl">
            <TbArrowsExchange size={26} className="text-accent" /> Trade your spares
          </div>
          <p className="mt-1 text-sm text-muted">Duplicates are worth more in someone else&apos;s hands. Swap them for the parts you&apos;re missing, or gift one to a friend (that counts for your daily gift job).</p>
          {spares.length === 0 ? (
            <p className="mt-5 rounded-2xl border-2 border-dashed border-border p-5 text-center text-sm text-muted">No spares yet. Open more crates and duplicates will show up here.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {spares.map(({ f, n }) => (
                <li key={f.type} className="flex items-center gap-2 rounded-xl border-2 border-black bg-black/40 py-1 pl-1 pr-3 text-sm">
                  <FragmentIcon type={f.type} size={28} /> {f.name} <b className="text-accent">×{n}</b>
                </li>
              ))}
            </ul>
          )}
          {missing.length > 0 && (
            <p className="mt-4 text-sm">
              Still missing: <b>{missing.map((f) => f.name).join(", ")}</b>
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/trade" className="btn btn-accent">
              <TbArrowsExchange size={18} /> Post a swap
            </Link>
            <Link href="/trade?tab=gift" className="btn btn-ghost">
              <TbGift size={18} /> Gift a card
            </Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="display text-2xl">Card log</div>
          {ledger.rows.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Every card that comes or goes shows up here.</p>
          ) : (
            <ul className="mt-3 divide-y-2 divide-black/60">
              {ledger.rows.map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-2 text-sm">
                  <FragmentIcon type={l.type} size={24} />
                  <span className="truncate">{FRAGMENT_BY_TYPE[l.type]?.name ?? l.type}</span>
                  <span className="ml-auto text-xs text-muted">{REASON[l.reason] ?? l.reason}</span>
                  <span className={`display w-10 text-right tabular-nums ${l.delta > 0 ? "text-accent" : "text-muted"}`}>
                    {l.delta > 0 ? "+" : ""}
                    {l.delta}
                  </span>
                  <span className="hidden w-28 text-right text-xs text-muted sm:inline">{fmtDateTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
