import Link from "next/link";
import { PageTitle, Stat, fmtDateTime } from "@/components/ui";
import { AllowlistForm, ProofLookup, RemoveAllowlist, SnapshotForm } from "@/components/admin/More";
import { currentEligibility, exportEligibility, listAllowlist, listSnapshots } from "@/lib/game/admin";
import { query } from "@/lib/db";

export default async function MintAdmin() {
  const [forge, extra, all, snaps] = await Promise.all([exportEligibility(), listAllowlist(), currentEligibility(), listSnapshots()]);
  const noWallet = Number((await query<{ n: string }>("select count(*)::text as n from mint_eligibility e join users u on u.id = e.user_id where e.status = 'approved' and u.status = 'active' and not exists (select 1 from wallets w where w.user_id = u.id and w.is_primary)")).rows[0].n);
  const revoked = Number((await query<{ n: string }>("select count(*)::text as n from mint_eligibility where status = 'revoked'")).rows[0].n);
  const byPhase = all.reduce<Record<number, number>>((m, r) => ((m[r.phase] = (m[r.phase] ?? 0) + 1), m), {});
  const cats = extra.reduce<Record<string, number>>((m, r) => ((m[r.category] = (m[r.category] ?? 0) + 1), m), {});
  return (
    <>
      <PageTitle kicker="Admin" title="Mint" sub="Phase 1 · Guaranteed is every active player who assembled a Nottie (with a linked wallet). Add partners and communities below. Freeze a snapshot to build the Merkle roots." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Assembled (GTD)" value={forge.length} accent />
        <Stat label="Extra allowlist" value={extra.length} hint={Object.entries(cats).map(([k, v]) => `${k}: ${v}`).join(" · ") || "none yet"} />
        <Stat label="GTD, no wallet" value={noWallet} hint="nudge them" />
        <Stat label="Revoked" value={revoked} hint="suspended" />
      </div>
      <div className="card mt-4 flex flex-wrap gap-4 p-4 text-sm">
        <span className="display">Eligible now by phase:</span>
        {Object.entries(byPhase).map(([ph, n]) => (
          <span key={ph}>Phase {ph}: <b className="text-accent">{n}</b></span>
        ))}
        <Link href="/api/admin?export=eligibility" className="ml-auto text-accent underline">GTD CSV</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SnapshotForm />
          <div className="card p-5">
            <div className="display text-xl">Snapshots</div>
            {snaps.length === 0 ? <p className="mt-2 text-sm text-muted">None frozen yet.</p> : (
              <ul className="mt-3 space-y-3">
                {snaps.map((s, i) => (
                  <li key={s.id} className="rounded-xl border-[3px] border-black bg-raised p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <b>#{s.id} {s.label}</b>
                      {i === 0 && <span className="display rounded-full border-2 border-black bg-accent px-2 text-[10px] text-black">live</span>}
                    </div>
                    <div className="text-xs text-muted">{fmtDateTime(s.created_at)} · {s.created_by}</div>
                    {Object.entries(s.roots).map(([ph, root]) => (
                      <div key={ph} className="mt-1 break-all font-mono text-[11px]">
                        <span className="text-accent">phase {ph}</span> ({s.counts[ph]}) {root}
                      </div>
                    ))}
                    <Link href={`/api/admin?export=snapshot&id=${s.id}`} className="mt-2 inline-block text-xs text-accent underline">Download CSV</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ProofLookup />
        </div>
        <div className="space-y-6">
          <AllowlistForm />
          <div className="card p-5">
            <div className="display text-xl">Extra allowlist ({extra.length})</div>
            <ul className="mt-2 max-h-96 divide-y-2 divide-black/60 overflow-auto text-xs">
              {extra.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 truncate font-mono">{r.address}</span>
                  <span className="text-accent">{r.category}</span>
                  <span className="text-muted">P{r.phase} ×{r.allocation}</span>
                  <RemoveAllowlist id={r.id} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
