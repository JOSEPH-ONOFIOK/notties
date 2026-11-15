import { TaskList, type TaskItem } from "@/components/TaskList";
import { PageTitle, Points } from "@/components/ui";
import { POINTS_NAME } from "@/lib/game/config";
import { listTasks } from "@/lib/game/tasks";
import { getSettings } from "@/lib/game/core";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Missions" };

export default async function Tasks() {
  const p = await currentPlayer();
  const [tasks, settings] = await Promise.all([listTasks(p.id) as unknown as Promise<TaskItem[]>, getSettings()]);
  return (
    <>
      <PageTitle kicker="Missions" title="Mission board" sub={`Jobs pinned up around town, paid in ${POINTS_NAME}. Missions pay once. Daily jobs reset at midnight UTC.`} right={<Points n={p.points} size="lg" />} />
      <TaskList tasks={tasks} suspended={p.accountStatus !== "active"} streak={{ streak: p.streak, checkedInToday: p.checkedInToday, ladder: (settings.streak_bonus ?? []).map(Number) }} />
    </>
  );
}
