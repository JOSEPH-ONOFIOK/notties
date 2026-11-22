import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Nav";
import { FragmentIcon } from "@/components/FragmentIcon";
import { PageTitle, Stat, fmtDateTime } from "@/components/ui";
import { FRAGMENTS, type FragmentType } from "@/lib/game/config";
import { playerDetail } from "@/lib/game/admin";
import { ResolveButton, StatusButton } from "@/components/admin/Controls";
import { AdjustForm } from "@/components/admin/More";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const d = await playerDetail(id);
  if (!d) notFound();
  const u = d.user;

  return (
    <>
      <PageTitle
        kicker={<Link href="/admin/players">Players</Link> as unknown as string}
        title={`@${u.x_username}`}
        sub={`X id ${u.x_id} · code ${u.ref_code} · joined ${fmtDateTime(u.created_at)}${d.referrer ? ` · referred by @${d.referrer}` : ""}`}
        right={
          <div className="flex items-center gap-3">
            <Avatar src={u.avatar_url} name={u.x_username} size={44} />
            <StatusButton userId={u.id} status={u.status} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Points" value={Number(u.points).toLocaleString()} hint={`${Number(u.lifetime_points).toLocaleString()} lifetime`} />
        <Stat label="Crates" value={u.claims} />
        <Stat label="Forge" value={d.forge ? "Done" : "—"} accent={!!d.forge} hint={d.forge ? fmtDateTime(d.forge.created_at as string) : undefined} />
        <Stat label="Open flags" value={d.risk.filter((r) => !r.resolved).length} />
      </div>

      <div className="mt-6">
        <AdjustForm userId={u.id} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Section title="Inventory">
          <ul className="grid grid-cols-4 gap-2">
            {FRAGMENTS.map((f) => (
              <li key={f.type} className="flex flex-col items-center rounded-xl bg-raised/40 p-2 text-xs">
                <FragmentIcon type={f.type} size={28} />
                <span className="mt-1 font-bold">×{d.inventory[f.type]}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Wallets">
          {d.wallets.length === 0 ? <Muted>None</Muted> : d.wallets.map((w) => <Row key={String(w.address)} l={<span className="font-mono text-xs">{String(w.address)}</span>} r={w.is_primary ? "primary" : ""} t={fmtDateTime(w.verified_at as string)} />)}
        </Section>
        <Section title="Risk events">
          {d.risk.length === 0 ? (
            <Muted>Clean</Muted>
          ) : (
            d.risk.map((r) => (
              <div key={String(r.id)} className={`flex items-center gap-2 py-1.5 text-sm ${r.resolved ? "opacity-50" : ""}`}>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${Number(r.severity) >= 2 ? "bg-[#2e0f0c] text-error" : "bg-[#2e2600] text-warn"}`}>{String(r.kind)}</span>
                <span className="truncate text-xs text-muted">{JSON.stringify(r.detail)}</span>
                <span className="ml-auto text-xs text-muted">{fmtDateTime(r.created_at as string)}</span>
                {!r.resolved && <ResolveButton riskId={String(r.id)} />}
              </div>
            ))
          )}
        </Section>
        <Section title={`Referrals made (${d.referrals.filter((r) => r.status === "verified").length} paid / ${d.referrals.length})`}>
          {d.referrals.length === 0 ? <Muted>None</Muted> : d.referrals.map((r, i) => <Row key={i} l={`@${r.x_username}`} r={r.status === "verified" ? "paid" : r.status === "pending" ? "waiting (hasn't liked the free mint post)" : String(r.status)} t={fmtDateTime(r.created_at as string)} />)}
        </Section>
        <Section title="Trades">
          {d.trades.length === 0 ? (
            <Muted>None</Muted>
          ) : (
            d.trades.map((t) => (
              <Row
                key={String(t.id)}
                l={
                  <span className="flex items-center gap-2">
                    <FragmentIcon type={t.type as FragmentType} size={20} /> {String(t.qty)} × {String(t.type)}
                  </span>
                }
                r={`@${t.sender} to @${t.recipient}`}
                t={fmtDateTime(t.created_at as string)}
              />
            ))
          )}
        </Section>
        <Section title="Points ledger">
          {d.points.map((p, i) => (
            <Row key={i} l={String(p.reason)} r={<span className={Number(p.delta) >= 0 ? "text-accent" : "text-error"}>{Number(p.delta) >= 0 ? "+" : ""}{String(p.delta)}</span>} t={fmtDateTime(p.created_at as string)} />
          ))}
        </Section>
        <Section title="Fragment ledger">
          {d.fragments.map((f, i) => (
            <Row key={i} l={`${String(f.reason)} · ${String(f.type)}`} r={<span className={Number(f.delta) >= 0 ? "text-accent" : "text-error"}>{Number(f.delta) >= 0 ? "+" : ""}{String(f.delta)}</span>} t={fmtDateTime(f.created_at as string)} />
          ))}
        </Section>
        <Section title="Tasks">
          {d.tasks.length === 0 ? <Muted>None</Muted> : d.tasks.map((t, i) => <Row key={i} l={String(t.task_id)} r={String(t.day) === "1970-01-01" ? "once" : String(t.day)} t={fmtDateTime(t.created_at as string)} />)}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card max-h-96 overflow-auto p-5">
      <div className="display mb-2 text-xl">{title}</div>
      {children}
    </div>
  );
}
const Muted = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted">{children}</p>;
function Row({ l, r, t }: { l: React.ReactNode; r: React.ReactNode; t: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-1.5 text-sm last:border-0">
      <span className="min-w-0 flex-1 truncate">{l}</span>
      <span className="text-xs">{r}</span>
      <span className="w-28 text-right text-xs text-muted">{t}</span>
    </div>
  );
}
