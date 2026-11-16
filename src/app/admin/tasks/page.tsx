import { PageTitle } from "@/components/ui";
import { listAllTasks } from "@/lib/game/admin";
import { TaskEditor } from "@/components/admin/Controls";

export default async function TasksAdmin() {
  const tasks = (await listAllTasks()) as unknown as { id: string; title: string; description: string; points: number; kind: string; verify: string; link: string | null; sort: number; active: boolean; starts_at: string | null; ends_at: string | null; proof_hint: string | null; gives_book: boolean }[];
  return (
    <>
      <PageTitle kicker="Admin" title="Tasks" sub="Built-in task ids (onboarding, follow_x, link_wallet, daily_checkin) have their points controlled from Economy, under rewards; custom tasks use the points field here." />
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskEditor />
        {tasks.map((t) => (
          <TaskEditor key={t.id} initial={t} />
        ))}
      </div>
    </>
  );
}
