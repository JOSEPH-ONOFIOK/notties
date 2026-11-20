"use client";

import { useEffect, useRef, useState } from "react";
import { TbSend, TbSpeakerphone, TbTrash } from "react-icons/tb";
import type { ChatMessage, Channel } from "@/lib/game/chat";
import { api } from "@/lib/client";
import { sfx } from "@/lib/sfx";
import { Avatar } from "../Nav";

function time(iso: string) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Live chat and announcements. Messages are kept on the player's device (localStorage), so a
 * visit only downloads what's new since last time. Checks every 6s for chat and 30s for
 * announcements, only while the tab is visible and someone has touched it in the last 3 minutes.
 */
const KEY = (c: Channel) => `nt_chat_${c}`;
function loadCache(c: Channel): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(c)) || "[]");
  } catch {
    return [];
  }
}
function merge(a: ChatMessage[], b: ChatMessage[]) {
  const m = new Map<number, ChatMessage>();
  for (const x of [...a, ...b]) m.set(x.id, x);
  return [...m.values()].sort((x, y) => x.id - y.id).slice(-150);
}
export function ChatRoom({ channel, initial, me, isAdmin, canPost }: { channel: Channel; initial: ChatMessage[]; me: string; isAdmin: boolean; canPost: boolean }) {
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const last = useRef(initial.at(-1)?.id ?? 0);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Show what this device already has, merged with what the server sent.
  useEffect(() => {
    const cached = loadCache(channel);
    if (!cached.length) return;
    const t = setTimeout(() => {
      // Inside the server's window, trust the server (a moderator may have deleted some).
      const oldest = initial[0]?.id ?? Infinity;
      const ids = new Set(initial.map((i) => i.id));
      setMsgs((cur) => merge(cached.filter((m) => m.id < oldest || ids.has(m.id)), cur));
    }, 0);
    return () => clearTimeout(t);
  }, [channel, initial]);

  // Save to the device whenever the list changes.
  useEffect(() => {
    try {
      localStorage.setItem(KEY(channel), JSON.stringify(msgs.slice(-150)));
    } catch {}
    last.current = Math.max(last.current, msgs.at(-1)?.id ?? 0);
  }, [msgs, channel]);

  useEffect(() => {
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    let active = Date.now();
    const poke = () => (active = Date.now());
    const evs = ["pointerdown", "keydown", "scroll", "focus"] as const;
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    const tick = async () => {
      if (!document.hidden && Date.now() - active < 180_000) {
        try {
          const r = await fetch(`/api/chat?channel=${channel}&after=${last.current}`, { cache: "no-store" }).then((x) => x.json());
          if (!stop && r.messages?.length) {
            last.current = r.messages.at(-1).id;
            setMsgs((m) => merge(m, r.messages));
            if (channel === "announce") sfx.pop();
          }
        } catch {}
      }
      if (!stop) t = setTimeout(tick, channel === "chat" ? 6_000 : 30_000);
    };
    t = setTimeout(tick, channel === "chat" ? 6_000 : 30_000);
    return () => {
      stop = true;
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, poke));
    };
  }, [channel]);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/chat", { action: channel === "announce" ? "announce" : "post", body: text });
      setText("");
      stick.current = true;
      const r = await fetch(`/api/chat?channel=${channel}&after=${last.current}`, { cache: "no-store" }).then((x) => x.json());
      if (r.messages?.length) {
        last.current = r.messages.at(-1).id;
        setMsgs((m) => merge(m, r.messages));
      }
    } catch (e) {
      sfx.error();
      setErr(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await api("/api/chat", { action: "delete", id: String(id) }).catch(() => {});
    setMsgs((m) => m.filter((x) => x.id !== id));
  }

  const announce = channel === "announce";
  return (
    <div className="card flex h-[calc(100dvh-360px)] min-h-[360px] flex-col overflow-hidden p-0 lg:h-[calc(100dvh-250px)]">
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted">{announce ? "No announcements yet. News from the team shows up here." : "No messages yet. Say hi!"}</p>}
        {msgs.map((m) =>
          announce ? (
            <div key={m.id} className="rounded-2xl border-[3px] border-black bg-accent/95 p-4 text-black shadow-[0_4px_0_#000]">
              <div className="flex items-center gap-2 text-xs font-bold">
                <TbSpeakerphone size={16} /> The Notties team · {time(m.at)}
                {isAdmin && (
                  <button onClick={() => remove(m.id)} className="ml-auto opacity-60 hover:opacity-100" aria-label="Delete announcement">
                    <TbTrash size={15} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words font-semibold">{m.body}</p>
            </div>
          ) : (
            <div key={m.id} className="group flex items-start gap-2.5">
              <Avatar src={m.avatar} name={m.author} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className={`font-bold ${m.author.toLowerCase() === me.toLowerCase() ? "text-accent" : "text-text"}`}>@{m.author}</span>
                  <span className="text-muted">{time(m.at)}</span>
                  {isAdmin && (
                    <button onClick={() => remove(m.id)} className="ml-auto text-muted opacity-0 hover:text-error group-hover:opacity-100" aria-label="Delete message">
                      <TbTrash size={14} />
                    </button>
                  )}
                </div>
                <p className="break-words text-sm">{m.body}</p>
              </div>
            </div>
          ),
        )}
      </div>
      {canPost ? (
        <div className="border-t-[3px] border-black bg-black/30 p-3">
          <div className="flex gap-2">
            {announce ? (
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder="Write an announcement for everyone…" className="min-w-0 flex-1 resize-none" />
            ) : (
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && send()} maxLength={280} placeholder="Say something…" className="min-w-0 flex-1" aria-label="Message" />
            )}
            <button onClick={send} disabled={busy || !text.trim()} className="btn btn-accent shrink-0 !px-4" aria-label="Send">
              <TbSend size={18} />
            </button>
          </div>
          {err && <div className="mt-1 text-xs font-bold text-error">{err}</div>}
        </div>
      ) : (
        <div className="border-t-[3px] border-black bg-black/30 p-3 text-center text-xs text-muted">{announce ? "Only the team can post announcements." : "Your account can't chat right now."}</div>
      )}
    </div>
  );
}
