import { handler } from "@/lib/api";
import { getPlayer } from "@/lib/game/core";

export const GET = handler({ name: "me" }, async (user) => ({ player: await getPlayer(user.x_id) }));
