import Image from "next/image";
import { Avatar } from "@/components/Nav";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PageTitle, fmtDate } from "@/components/ui";
import { FACTIONS } from "@/lib/game/config";
import { levelInfo } from "@/lib/game/level";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const p = await currentPlayer();
  const lv = levelInfo(p.lifetimePoints);
  const f = FACTIONS.find((x) => x.id === p.faction);
  return (
    <>
      <PageTitle kicker="Settings" title="Your account" />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card h-fit p-6">
          <div className="flex items-center gap-4">
            <Avatar src={p.avatar} name={p.username} size={64} ring />
            <div className="min-w-0">
              <div className="display truncate text-2xl">@{p.username}</div>
              <div className="text-xs text-muted">Playing since {fmtDate(p.createdAt)}</div>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Level", `${lv.level} · ${lv.title}`],
              ["Player code", p.refCode],
              ["TROUBLE now", p.points.toLocaleString()],
              ["Total earned", p.lifetimePoints.toLocaleString()],
              ["Spent", p.spent.toLocaleString()],
              ["Best streak", `${p.bestStreak} days`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border-2 border-black bg-black/30 p-2.5">
                <dt className="text-[10px] uppercase tracking-widest text-muted">{k}</dt>
                <dd className="display mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
          {f ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border-[3px] border-black p-2.5" style={{ background: f.color }}>
              <div className="relative h-12 w-12 overflow-hidden rounded-lg border-2 border-black">
                <Image src={f.img} alt="" fill sizes="48px" className="object-cover" />
              </div>
              <div className="text-black">
                <div className="display">{f.name}</div>
                <div className="text-xs font-semibold">{f.motto}</div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted">No gang yet. You can pick one in the city once you&apos;ve cracked a crate.</p>
          )}
          {p.accountStatus === "suspended" && <p className="mt-4 rounded-xl border-2 border-black bg-[#3a120e] p-3 text-sm text-error">Under review: rewards are paused until the team clears your account.</p>}
        </div>
        <SettingsPanel />
      </div>
    </>
  );
}
