import Link from "next/link";
import { PageTitle, fmtDate } from "@/components/ui";
import { botScores, BOT_SIGNALS, BOT_THRESHOLD } from "@/lib/game/admin";

export default async function Bots() {
  const rows = await botScores();
  const bots = rows.filter((r) => r.score >= BOT_THRESHOLD);
  const real = rows.length - bots.length;
  const counts = Object.fromEntries(Object.keys(BOT_SIGNALS).map((k) => [k, rows.filter((r) => r.signals.includes(k)).length]));
  return (
    <>
      <PageTitle
        kicker="Admin"
        title="Bot check"
        sub={`${rows.length.toLocaleString()} players: ${real.toLocaleString()} look real, ${bots.length.toLocaleString()} look like bots (score ${BOT_THRESHOLD}+). Signals, not proof.`}
        right={
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin?export=real" className="btn text-sm">Real players (CSV)</a>
            <a href="/api/admin?export=bots" className="btn btn-ghost text-sm">Likely bots (CSV)</a>
          </div>
        }
      />
      <div className="card mb-6 p-5">
        <div className="display text-xl">How the score works</div>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {Object.entries(BOT_SIGNALS).map(([k, s]) => (
            <li key={k} className="flex gap-2">
              <b className="w-8 shrink-0 text-accent">+{s.pts}</b>
              <span className="flex-1">{s.label}</span>
              <span className="tabular-nums text-muted">{counts[k].toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="display mb-2 text-xl">Likely bots ({bots.length.toLocaleString()})</div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="p-3">Player</th>
              <th className="p-3">Score</th>
              <th className="p-3">Why</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bots.slice(0, 500).map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <Link href={`/admin/players/${r.id}`} className="font-bold hover:text-accent">@{r.x_username}</Link>
                </td>
                <td className="p-3 font-bold tabular-nums text-error">{r.score}</td>
                <td className="p-3 text-xs text-muted">{r.signals.map((k) => k.replace(/_/g, " ")).join(", ")}</td>
                <td className="p-3 text-muted">{fmtDate(r.created_at)}</td>
                <td className="p-3 tabular-nums">{Number(r.points).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bots.length > 500 && <p className="p-3 text-xs text-muted">Showing the top 500. Download the CSV for all of them.</p>}
      </div>
    </>
  );
}
