import { TaskList, type TaskItem } from "@/components/TaskList";
import { PageTitle, Points } from "@/components/ui";
import { POINTS_NAME } from "@/lib/game/config";
import { listTasks } from "@/lib/game/tasks";
import { getSettings } from "@/lib/game/core";
import { currentPlayer } from "@/lib/player";
import { currentRound } from "@/lib/game/rounds";

export const metadata = { title: "Missions" };

export default async function Tasks() {
  const p = await currentPlayer();
  const [tasks, settings] = await Promise.all([listTasks(p.id) as unknown as Promise<TaskItem[]>, getSettings()]);
  const round = currentRound(settings.task_rounds);
  const nextLabel = currentRound(settings.task_rounds, Date.parse(round.end)).label;
  return (
    <>
      <PageTitle kicker="Missions" title="Mission board" sub={`Every mission pays ${POINTS_NAME} and free crates, delivered to your mailbox. Fresh missions drop twice a day.`} right={<Points n={p.points} size="lg" />} />
      <TaskList tasks={tasks} suspended={p.accountStatus !== "active"} streak={{ streak: p.streak, checkedInToday: p.checkedInToday, ladder: (settings.streak_bonus ?? []).map(Number) }} round={{ end: round.end, nextLabel: nextLabel, tz: settings.task_rounds.label }} />
    </>
  );
}
