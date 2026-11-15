import { handler, json } from "@/lib/api";
import { claimTask, clickTask, listTasks, submitTask } from "@/lib/game/tasks";
import { GameError } from "@/lib/db";

export const GET = handler({ name: "tasks" }, async (user) => ({ tasks: await listTasks(user.id) }));

export const POST = handler({ name: "tasks", limit: [30, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "click" | "claim" | "submit"; taskId?: string; proof?: string }>(req);
  if (!b.taskId || !/^[a-z0-9_]{1,64}$/.test(b.taskId)) throw new GameError("Bad task");
  if (b.action === "submit") return { result: await submitTask(user.id, b.taskId, b.proof ?? "") };
  if (b.action === "click") {
    await clickTask(user.id, b.taskId);
    return {};
  }
  return { result: await claimTask(user.id, b.taskId) };
});
