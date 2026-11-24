import { Avatar } from "@/components/Nav";
import { LabEscape } from "@/components/game/LabEscape";
import { PageTitle } from "@/components/ui";
import { getSettings } from "@/lib/game/core";
import { DEFAULT_LOOK, LAYER_ORDER, lookFromSeed } from "@/lib/game/look";
import { myRunnerToday, runnerBoard, sharedToday } from "@/lib/game/runner";
import { currentPlayer } from "@/lib/player";
import { redirect } from "next/navigation";

export const metadata = { title: "Lab Escape" };

export default async function Play() {
  const p = await currentPlayer();
  if (!p.canPlay) redirect("/dashboard");
  const [s, board, mine, shared] = await Promise.all([getSettings(), runnerBoard(), myRunnerToday(p.id), sharedToday(p.id)]);
  const look = p.nottieSeed ? lookFromSeed(p.nottieSeed) : DEFAULT_LOOK;
  const layers = LAYER_ORDER.filter((l) => l !== "background").map((l) => look[l].src);
  return (
    <>
      <PageTitle kicker="Play" title="Lab Escape" sub={`Run from Vlad's lab. Every goo drop is ${s.runner_goo_value} $NOTTIES, up to ${s.runner_daily_cap.toLocaleString()} a day. Post your score for +${s.runner_share_reward} more. Beat today's high score, and during Gang Wars every point you score counts for your gang.`} />
      <LabEscape layers={layers} earnedToday={mine.earned} cap={s.runner_daily_cap} best={mine.best} suspended={p.accountStatus !== "active"} gooValue={s.runner_goo_value} shareReward={s.runner_share_reward} sharedToday={shared} refCode={p.refCode} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="display mb-2 text-xl">Today&apos;s top runners</h2>
          {board.length === 0 ? (
            <p className="card p-4 text-sm text-muted">No runs yet today. Set the first high score!</p>
          ) : (
            <ol className="card divide-y-2 divide-black/60 overflow-hidden p-0">
              {board.map((r, i) => (
                <li key={r.username} className={`flex items-center gap-3 px-4 py-2.5 ${r.username === p.username ? "bg-accent/10" : ""}`}>
                  <span className={`display w-6 text-center ${i < 3 ? "text-accent" : "text-muted"}`}>{i + 1}</span>
                  <Avatar src={r.avatar} name={r.username} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm">@{r.username}</span>
                  <span className="display tabular-nums">{r.score.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside className="card h-fit p-4 text-sm">
          <div className="display text-lg">Your day</div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              ["Best", mine.best],
              ["Runs", mine.runs],
              ["Earned", `${mine.earned.toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-xl border-2 border-black bg-black/40 p-2">
                <dt className="text-[10px] uppercase tracking-widest text-muted">{k}</dt>
                <dd className="display text-lg">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">Tip: double jump over tall lasers, single hop over slime. It gets faster the longer you survive.</p>
        </aside>
      </div>
    </>
  );
}
