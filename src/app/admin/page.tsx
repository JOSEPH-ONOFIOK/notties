import Link from "next/link";
import { FragmentIcon } from "@/components/FragmentIcon";
import { PageTitle, Stat } from "@/components/ui";
import { FRAGMENTS, POINTS_NAME } from "@/lib/game/config";
import { overview } from "@/lib/game/admin";
import { getSettings } from "@/lib/game/core";
import { Toggle } from "@/components/admin/Controls";

export default async function AdminHome() {
  const [o, s] = await Promise.all([overview(), getSettings()]);
  return (
    <>
      <PageTitle kicker="Admin" title="Overview" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Players" value={o.players} hint={`${o.suspended} suspended`} />
        <Stat label="Assembled" value={o.forged} accent hint={`${o.gtd} GTD approved`} />
        <Stat label="Wallets linked" value={o.walletsLinked} />
        <Stat label={`${POINTS_NAME} issued`} value={o.points.toLocaleString()} />
        <Stat label="Crates · 24h" value={o.claims24} />
        <Stat label="Trades · 24h" value={o.trades24} />
        <Stat label="Open risk events" value={o.risk} hint={o.risk ? "needs review" : "clear"} />
        <Link href="/api/admin?export=eligibility" className="card flex flex-col justify-between p-4 transition hover:border-accent">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Export</div>
          <div className="display text-2xl text-accent">GTD CSV ↓</div>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="display text-2xl">Kill switches</div>
          <p className="mt-1 text-sm text-muted">Flip any of these to pause a system instantly. Players see a friendly message.</p>
          <div className="mt-4 space-y-3">
            <Toggle k="claims_enabled" label="Crate claims" value={s.claims_enabled} />
            <Toggle k="trade_enabled" label="Trading" value={s.trade_enabled} />
            <Toggle k="forge_enabled" label="Forge (assembly)" value={s.forge_enabled} />
            <Toggle k="shop_enabled" label="Bonus crate shop" value={s.shop_enabled} />
          </div>
        </div>
        <div className="card p-6">
          <div className="display text-2xl">Fragments in circulation</div>
          <ul className="mt-4 space-y-2">
            {FRAGMENTS.map((f) => (
              <li key={f.type} className="flex items-center gap-3 text-sm">
                <FragmentIcon type={f.type} size={24} />
                <span className="font-bold">{f.name}</span>
                <span className="ml-auto tabular-nums">{(o.supply[f.type] ?? 0).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
