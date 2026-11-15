import { FragmentIcon } from "@/components/FragmentIcon";
import { PawnShop } from "@/components/PawnShop";
import { FragmentCard } from "@/components/game/FragmentCard";
import { PageTitle, Points, ProgressBar, fmtDateTime } from "@/components/ui";
import { FRAGMENTS, FRAGMENT_BY_TYPE, type FragmentType } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { query } from "@/lib/db";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Stash" };

const REASON: Record<string, string> = { crate: "Crate", trade_in: "Received", trade_out: "Sent", forge: "Assembled", pawn: "Pawned", admin: "Gift" };

export default async function Inventory() {
  const p = await currentPlayer();
  const [s, ledger] = await Promise.all([
    getSettings(),
    query<{ type: FragmentType; delta: number; reason: string; created_at: string }>("select type, delta, reason, created_at from fragment_ledger where user_id = $1 order by id desc limit 30", [p.id]),
  ]);
  const found = FRAGMENTS.filter((f) => p.inventory[f.type] > 0).length;

  return (
    <>
      <PageTitle kicker="Stash" title="Card collection" sub={`${found}/8 fragment types found · ${p.fragments} cards total.`} right={<Points n={p.points} size="lg" />} />
      <ProgressBar pct={Math.round((found / 8) * 100)} tall className="mb-8" />

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FRAGMENTS.map((f) => {
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
        <PawnShop inventory={p.inventory} prices={s.pawn_prices} enabled={s.pawn_enabled} suspended={p.accountStatus !== "active"} />
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
