import Link from "next/link";
import { ChatRoom } from "@/components/game/ChatRoom";
import { PageTitle } from "@/components/ui";
import { adminIdentity, can } from "@/lib/game/admin";
import { readChat } from "@/lib/game/chat";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Chat" };

export default async function Chat({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [p, sp, admin] = await Promise.all([currentPlayer(), searchParams, adminIdentity()]);
  const tab = sp.tab === "chat" ? "chat" : "announce";
  const messages = await readChat(tab);
  const isOwner = can(admin, "owner");
  return (
    <>
      <PageTitle kicker="Community" title={tab === "announce" ? "Announcements" : "Live chat"} sub={tab === "announce" ? "News, missions and drops straight from the team." : "Talk to other players. Find trades. Be nice."} />
      <div className="mb-4 flex gap-2">
        {[
          ["announce", "Announcements"],
          ["chat", "Live chat"],
        ].map(([k, label]) => (
          <Link key={k} href={`/chat?tab=${k}`} className={`display rounded-full border-[3px] border-black px-4 py-2 text-sm tracking-wider shadow-[0_3px_0_#000] transition hover:-translate-y-0.5 ${tab === k ? "bg-accent text-black" : "bg-raised text-muted"}`}>
            {label}
          </Link>
        ))}
      </div>
      <ChatRoom key={tab} channel={tab} initial={messages} me={p.username} isAdmin={can(admin, "moderator")} canPost={tab === "announce" ? isOwner : p.accountStatus === "active"} />
    </>
  );
}
