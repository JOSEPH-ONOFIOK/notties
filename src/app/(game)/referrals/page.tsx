import { headers } from "next/headers";
import { CopyButton, ShareOnX } from "@/components/CopyButton";
import { PageTitle, Stat, fmtDate } from "@/components/ui";
import { POINTS_NAME } from "@/lib/game/config";
import { getSettings } from "@/lib/game/core";
import { referralSummary } from "@/lib/game/referrals";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Referrals" };

export default async function Referrals() {
  const p = await currentPlayer();
  const [s, r, h] = await Promise.all([getSettings(), referralSummary(p.id), headers()]);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const link = `${origin}/?ref=${p.refCode}`;

  return (
    <>
      <PageTitle kicker="Referrals" title="Recruit troublemakers" sub={`${s.points.referral} ${POINTS_NAME} per recruit, sent to your mailbox once they join with your link and like our launch tweet. A click alone doesn't count.`} />

      <div className="card p-6">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Your link</div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-xl border border-border bg-raised px-4 py-3 text-sm">{link}</code>
          <div className="flex gap-2">
            <CopyButton text={link} />
            <ShareOnX text={`I'm raiding Vlad's lab to assemble a Nottie before mint. Come cause trouble with me.`} url={link} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Your player code is <b className="text-text">{p.refCode}</b>. It doubles as your trade handle.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recruited" value={r.total} />
        <Stat label="Paid" value={r.verified} accent />
        <Stat label="Waiting" value={r.pending} hint="haven't liked the tweet yet" />
        <Stat label={`${POINTS_NAME} earned`} value={r.points.toLocaleString()} />
      </div>

      <div className="card mt-4 p-6">
        <div className="display text-2xl">Recruits</div>
        {r.recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nobody yet. Post the link where the troublemakers hang out.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {r.recent.map((x, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <span className="font-bold">@{x.username}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${x.status === "verified" ? "bg-accent-soft text-accent" : x.status === "pending" ? "bg-raised text-muted" : "bg-[#2e0f0c] text-error"}`}>{x.status === "verified" ? "paid" : x.status === "pending" ? "waiting" : x.status}</span>
                <span className="ml-auto text-xs text-muted">{fmtDate(x.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">Self-referrals, repeat rewards for the same player, and coordinated farming are rejected. Sharing an IP or device alone is never a reason for rejection.</p>
    </>
  );
}
