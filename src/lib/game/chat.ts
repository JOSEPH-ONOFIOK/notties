import "server-only";
import { GameError, query } from "../db";
import { bust, cached } from "../cache";

/**
 * Two channels: "chat" (any active player) and "announce" (the team, from admin accounts).
 * Everyone sees the same messages, so the latest 60 per channel are cached for a few seconds
 * and polling clients filter that list instead of querying.
 */
export type Channel = "chat" | "announce";
export type ChatMessage = { id: number; author: string; avatar: string | null; body: string; team: boolean; at: string };

const KEEP = 60;

export async function readChat(channel: Channel, after = 0): Promise<ChatMessage[]> {
  // Chat refreshes every few seconds; announcements change rarely, so they're kept longer.
  const latest = await cached(`chat:${channel}`, channel === "chat" ? 4_000 : 30_000, async () => {
    const { rows } = await query<{ id: string; author: string; avatar: string | null; body: string; team: boolean; at: string }>(
      `select m.id, m.author, u.avatar_url as avatar, m.body, (m.channel = 'announce' or m.user_id is null) as team, m.created_at as at
         from chat_messages m left join users u on u.id = m.user_id
        where m.channel = $1 and not m.deleted and (u.id is null or u.status = 'active')
        order by m.id desc limit $2`,
      [channel, KEEP],
    );
    return rows.map((r) => ({ ...r, id: Number(r.id), at: new Date(r.at).toISOString() })).reverse();
  });
  return latest.filter((m) => m.id > after);
}

export async function postChat(userId: string, username: string, body: string) {
  const text = body.replace(/\s+/g, " ").trim().slice(0, 280);
  if (text.length < 1) throw new GameError("Say something first");
  const st = (await query<{ status: string }>("select status from users where id = $1", [userId])).rows[0];
  if (st?.status !== "active") throw new GameError("Your account can't chat right now");
  const recent = (await query<{ at: string }>("select max(created_at) as at from chat_messages where user_id = $1 and channel = 'chat'", [userId])).rows[0]?.at;
  if (recent && Date.now() - new Date(recent).getTime() < 3_000) throw new GameError("Slow down a little");
  await query("insert into chat_messages (channel, user_id, author, body) values ('chat', $1, $2, $3)", [userId, username, text]);
  bust("chat:chat");
}

export async function postAnnouncement(admin: string, body: string) {
  const text = body.trim().slice(0, 1000);
  if (text.length < 2) throw new GameError("Write the announcement first");
  await query("insert into chat_messages (channel, user_id, author, body) values ('announce', null, $1, $2)", ["The Notties", text]);
  void admin;
  bust("chat:announce");
}

export async function deleteMessage(id: string) {
  await query("update chat_messages set deleted = true where id = $1", [id]);
  bust("chat:");
}
