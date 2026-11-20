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
  const live = tasks.filter((t) => t.active && t.ends_at && (at(t.starts_at) ?? 0) <= now && at(t.ends_at)! > now);
  const scheduled = tasks.filter((t) => t.active && at(t.starts_at) !== null && at(t.starts_at)! > now);
  const always = tasks.filter((t) => t.active && !t.ends_at && !(at(t.starts_at) && at(t.starts_at)! > now));
  const expired = tasks.filter((t) => t.active && t.ends_at && at(t.ends_at)! <= now);
  const archived = tasks.filter((t) => !t.active);
  const rounds = settings.task_rounds;

  const group = (title: string, list: T[], note?: string) =>
    list.length > 0 && (
      <section className="mt-8">
        <h2 className="display text-2xl">
          {title} <span className="text-muted">({list.length})</span>
        </h2>
        {note && <p className="text-sm text-muted">{note}</p>}
        <div className="mt-3 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {list.map((t) => (
            <TaskEditor key={t.id} initial={t} rounds={rounds} />
          ))}
        </div>
      </section>
    );

  return (
    <>
      <PageTitle
        kicker="Admin"
        title="Missions"
        sub={`Pick a round when you add a mission. It shows up when the round starts and disappears when it ends, so each day starts fresh at ${rounds.hours[0]}:00 ${rounds.label}. Every mission pays $NOTTIES plus free crates, sent to the player's mailbox.`}
      />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <TaskEditor rounds={rounds} />
      </div>
      {group("Live this round", live)}
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
                <TaskEditor key={t.id} initial={t} rounds={rounds} />
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
              <TaskEditor key={t.id} initial={t} rounds={rounds} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
