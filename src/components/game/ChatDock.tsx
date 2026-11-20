"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TbArrowsMaximize, TbMessages, TbX } from "react-icons/tb";
import { sfx } from "@/lib/sfx";
import { ChatRoom } from "./ChatRoom";

/**
 * Desktop only: live chat as a side panel on the right of every game page. A tab on the edge
 * opens it; the open/closed state is remembered. It only polls while open. Phones use /chat.
 */
export function ChatDock({ me, canPost }: { me: string; canPost: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "announce">("chat");

  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem("nt_dock") === "1";
    } catch {}
    const t = setTimeout(() => setOpen(saved), 0);
    return () => clearTimeout(t);
  }, []);
  const toggle = (v: boolean) => {
    setOpen(v);
    sfx.click();
    try {
      localStorage.setItem("nt_dock", v ? "1" : "0");
    } catch {}
  };

  const showing = open && !path.startsWith("/chat");
  // While the panel is open, the page makes room for it (the game layout pads by --dock on desktop).
  useEffect(() => {
    document.documentElement.style.setProperty("--dock", showing ? "356px" : "0px");
    return () => {
      document.documentElement.style.setProperty("--dock", "0px");
    };
  }, [showing]);

  if (path.startsWith("/chat")) return null;

  return (
    <div className="hidden lg:block">
      {!open && (
        <button onClick={() => toggle(true)} className="display fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl border-[3px] border-r-0 border-black bg-accent px-2 py-4 text-black shadow-[-4px_4px_0_#000] transition hover:pr-3" aria-label="Open chat">
          <TbMessages size={20} />
          <span className="text-xs tracking-widest [writing-mode:vertical-rl]">CHAT</span>
        </button>
      )}
      {open && (
        <aside className="fixed bottom-4 right-4 top-[132px] z-40 flex w-[340px] flex-col overflow-hidden rounded-3xl border-[3px] border-black bg-[#151910] shadow-[0_8px_0_#000] anim-pop" aria-label="Chat">
          <div className="flex items-center gap-1.5 border-b-[3px] border-black bg-black/40 p-2">
            {(
              [
                ["chat", "Live chat"],
                ["announce", "News"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`display rounded-full border-2 border-black px-3 py-1 text-xs tracking-wider ${tab === k ? "bg-accent text-black" : "bg-raised text-muted"}`}>
                {label}
              </button>
            ))}
            <Link href={`/chat?tab=${tab}`} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-raised hover:text-text" aria-label="Open full page" title="Full page">
              <TbArrowsMaximize size={16} />
            </Link>
            <button onClick={() => toggle(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-raised hover:text-text" aria-label="Close chat">
              <TbX size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ChatRoom key={tab} channel={tab} initial={[]} me={me} isAdmin={false} canPost={tab === "chat" ? canPost : false} fill />
          </div>
        </aside>
      )}
    </div>
  );
}
