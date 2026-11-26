import Link from "next/link";
import { PageTitle, fmtDateTime } from "@/components/ui";
import { riskQueue } from "@/lib/game/admin";
import { ResolveButton } from "@/components/admin/Controls";
import { ReviewButtons } from "@/components/admin/More";
import { pendingSubmissions } from "@/lib/game/tasks";

const EXPLAIN: Record<string, string> = {
  early_claim: "Hit the claim endpoint before cooldown ended (the browser disables the button, so repeats mean scripting).",
  trade_burst: "30+ outbound transfers in an hour.",
  duplicate_forge: "Tried to assemble a second time.",
  fast_task: "Claimed a link task within seconds of opening it.",
  wallet_reuse: "Tried to link a wallet already owned by another player.",
  new_x_account: "X account younger than 14 days at sign-up. Informational.",
  farm_invite: "Signed up through a suspended player's invite link, so it started suspended. Restore it if it's a real player.",
  swap_pair: "The same two accounts keep swapping with each other (5+ in a day).",
};

export default async function Risk() {
  const [rows, subs] = await Promise.all([riskQueue(200), pendingSubmissions()]);
  return (
    <>
      <PageTitle kicker="Admin" title="Review queue" sub="Signals, not verdicts. Look at the player's history before suspending. Suspension pauses rewards and revokes GTD until restored." />
      <div className="card mb-6 p-5">
        <div className="display text-xl">Mission proofs to review ({subs.length})</div>
        {subs.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing waiting.</p> : (
          <ul className="mt-3 divide-y-2 divide-black/60">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <Link href={`/admin/players/${s.user_id}`} className="font-bold hover:text-accent">@{s.username}</Link>
                <span className="text-muted">{s.title}</span>
                {/^https?:\/\//.test(s.proof) ? <a href={s.proof} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-accent underline">{s.proof}</a> : <span className="min-w-0 flex-1 truncate">{s.proof}</span>}
                <span className="text-xs text-muted">{fmtDateTime(s.created_at)}</span>
                <ReviewButtons id={s.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="display mb-2 text-xl">Flags</div>
      <div className="card divide-y divide-border">
        {rows.length === 0 && <p className="p-6 text-sm text-muted">Nothing flagged. Suspiciously quiet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.severity >= 2 ? "bg-[#2e0f0c] text-error" : "bg-[#2e2600] text-warn"}`}>{r.kind}</span>
            <Link href={`/admin/players/${r.user_id}`} className="font-bold hover:text-accent">
              @{r.username ?? "?"}
            </Link>
            <span className="text-xs text-muted">{r.n} open</span>
            <span className="w-full text-xs text-muted sm:w-auto sm:flex-1">{EXPLAIN[r.kind] ?? JSON.stringify(r.detail)}</span>
            <span className="text-xs text-muted">{fmtDateTime(r.created_at)}</span>
            <ResolveButton riskId={r.id} />
          </div>
        ))}
      </div>
    </>
  );
}
