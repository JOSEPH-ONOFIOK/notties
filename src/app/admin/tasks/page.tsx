import { PageTitle } from "@/components/ui";
import { listAllTasks } from "@/lib/game/admin";
import { getSettings } from "@/lib/game/core";
import { ArchiveExpiredButton, TaskEditor } from "@/components/admin/Controls";

type T = { id: string; title: string; description: string; points: number; kind: string; verify: string; link: string | null; sort: number; active: boolean; starts_at: string | null; ends_at: string | null; proof_hint: string | null; gives_book: boolean; crates: number };

const nowMs = () => Date.now();

export default async function TasksAdmin() {
  const [tasks, settings] = await Promise.all([listAllTasks() as unknown as Promise<T[]>, getSettings()]);
  const now = nowMs();
  const at = (v: string | null) => (v ? Date.parse(v) : null);
  const lateMs = settings.late_window_hours * 3600_000;
  const started = (t: T) => (at(t.starts_at) ?? 0) <= now;
  const live = tasks.filter((t) => t.active && t.ends_at && started(t) && at(t.ends_at)! > now);
  const late = tasks.filter((t) => t.active && t.ends_at && at(t.ends_at)! <= now && at(t.ends_at)! + lateMs > now);
  const scheduled = tasks.filter((t) => t.active && !started(t));
  const always = tasks.filter((t) => t.active && !t.ends_at && started(t));
  const expired = tasks.filter((t) => t.active && t.ends_at && at(t.ends_at)! + lateMs <= now);
  const archived = tasks.filter((t) => !t.active);
  const ed = { latePct: settings.late_reward_pct, lateHours: settings.late_window_hours };

  const group = (title: string, list: T[], note?: string) =>
    list.length > 0 && (
      <section className="mt-8">
        <h2 className="display text-2xl">
          {title} <span className="text-muted">({list.length})</span>
        </h2>
        {note && <p className="text-sm text-muted">{note}</p>}
        <div className="mt-3 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {list.map((t) => (
            <TaskEditor key={t.id} initial={t} {...ed} />
          ))}
        </div>
      </section>
    );

  return (
    <>
      <PageTitle
        kicker="Admin"
        title="Missions"
        sub={`Give each mission a deadline. Before it, players get the full reward. After it, they get ${settings.late_reward_pct}% for ${settings.late_window_hours} more hours, then the mission disappears. Rewards go to the player's mailbox.`}
      />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <TaskEditor {...ed} />
      </div>
      {group("Live (full reward)", live)}
      {group(`Past deadline (${settings.late_reward_pct}% reward)`, late, `Still claimable until ${settings.late_window_hours}h after the deadline.`)}
      {group("Scheduled", scheduled, "Will appear when their round starts.")}
      {group("Always on", always, "No round. Built-in ids (onboarding, follow_x, link_wallet, daily_checkin) take their $NOTTIES from Economy.")}
      {expired.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="display text-2xl">
              Ended <span className="text-muted">({expired.length})</span>
            </h2>
            <ArchiveExpiredButton count={expired.length} />
          </div>
          <p className="text-sm text-muted">Players can&apos;t see these any more. Clear them to tidy this list.</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted">Show</summary>
            <div className="mt-3 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
              {expired.map((t) => (
                <TaskEditor key={t.id} initial={t} {...ed} />
              ))}
            </div>
          </details>
        </section>
      )}
      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="display cursor-pointer text-xl text-muted">Archived ({archived.length})</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {archived.map((t) => (
              <TaskEditor key={t.id} initial={t} {...ed} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
