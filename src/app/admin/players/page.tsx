import Link from "next/link";
import { Avatar } from "@/components/Nav";
import { PageTitle, fmtDate } from "@/components/ui";
import { countPlayers, searchPlayers } from "@/lib/game/admin";
import { StatusButton } from "@/components/admin/Controls";

const PER_PAGE = 100;

export default async function Players({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page: pg = "1" } = await searchParams;
  const page = Math.max(1, Number(pg) || 1);
  const [rows, total] = await Promise.all([searchPlayers(q, PER_PAGE, (page - 1) * PER_PAGE), countPlayers(q)]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (n: number) => `/admin/players?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;
  const pager = pages > 1 && (
    <div className="my-3 flex flex-wrap items-center gap-2 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-ghost !min-h-[36px] !px-3 text-xs">
          ← Previous
        </Link>
      ) : null}
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-ghost !min-h-[36px] !px-3 text-xs">
          Next →
        </Link>
      ) : null}
    </div>
  );
  return (
    <>
      <PageTitle kicker="Admin" title="Players" sub={`${total.toLocaleString()} player${total === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}. Showing ${rows.length ? (page - 1) * PER_PAGE + 1 : 0}–${(page - 1) * PER_PAGE + rows.length}.`} right={<a href="/api/admin?export=players" className="btn btn-ghost text-sm">Download all (CSV)</a>} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="x username, player code or x id" className="max-w-md" />
        <button className="btn btn-ghost">Search</button>
      </form>
      {pager}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="p-3">Player</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Points</th>
              <th className="p-3">Crates</th>
              <th className="p-3">Recruits</th>
              <th className="p-3">Referred by</th>
              <th className="p-3">Wallet</th>
              <th className="p-3">Flags</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id} className={u.status !== "active" ? "opacity-60" : ""}>
                <td className="p-3">
                  <Link href={`/admin/players/${u.id}`} className="flex items-center gap-2 hover:text-accent">
                    <Avatar src={u.avatar_url} name={u.x_username} size={28} />
                    <span className="font-bold">@{u.x_username}</span>
                    {u.forged && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-bg">forged</span>}
                  </Link>
                </td>
                <td className="p-3 text-muted">{fmtDate(u.created_at)}</td>
                <td className="p-3 tabular-nums">{Number(u.points).toLocaleString()}</td>
                <td className="p-3 tabular-nums">{u.claims}</td>
                <td className="p-3 tabular-nums" title="paid / total">
                  {u.recruits ? (
                    <>
                      <b className="text-accent">{u.recruits_paid}</b>
                      <span className="text-muted"> / {u.recruits}</span>
                    </>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="p-3 text-xs">{u.referrer ? `@${u.referrer}` : <span className="text-muted">—</span>}</td>
                <td className="p-3 font-mono text-xs">{u.wallet ? `${u.wallet.slice(0, 6)}…${u.wallet.slice(-4)}` : "—"}</td>
                <td className="p-3">{u.risk > 0 ? <span className="text-warn">{u.risk}</span> : <span className="text-muted">0</span>}</td>
                <td className="p-3">{u.status}</td>
                <td className="p-3 text-right">
                  <StatusButton userId={u.id} status={u.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-6 text-muted" colSpan={10}>
                  No players match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pager}
    </>
  );
}
