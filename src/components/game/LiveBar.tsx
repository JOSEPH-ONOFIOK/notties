"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TbBolt, TbClock, TbFlame, TbFlask2, TbArrowsExchange, TbUsers } from "react-icons/tb";
import { fmtDuration, serverNow, syncClock } from "@/lib/client";
import { EVENT_STYLE, FACTIONS, FRAGMENT_BY_TYPE, RARITY_COLOR, type FragmentType, type Rarity } from "@/lib/game/config";
import { sfx } from "@/lib/sfx";
import { FragmentIcon } from "../FragmentIcon";
import { useMounted } from "../useMounted";

type Ev = { key: string; name: string; kind: string; starts_at: string; ends_at: string };
type Timeline = { active: Ev[]; next: Ev | null; serverNow: string };
type Item = { id: number; username: string; kind: string; data: Record<string, unknown>; created_at: string };

/**
 * Live strip under the nav: the current event (or a countdown to the next one) plus a ticker of
 * big pulls, assemblies and swaps from everyone. Polls the server every 10s; when an event starts
 * or ends on the server clock, the page refreshes so odds and rewards update for everyone at once.
 */
export function LiveBar({ initial, feed, compact = false }: { initial: Timeline; feed: Item[]; compact?: boolean }) {
  const router = useRouter();
  const mounted = useMounted();
  const [tl, setTl] = useState(initial);
  const [items, setItems] = useState(feed);
  const [fresh, setFresh] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.parse(initial.serverNow));
  const last = useRef(feed[0]?.id ?? 0);
  const boundary = useRef<string>("");

  useEffect(() => {
    syncClock(initial.serverNow);
  }, [initial.serverNow]);

  useEffect(() => {
    const tick = setInterval(() => setNow(serverNow()), 1000);
    const poll = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/feed?after=${last.current}`, { cache: "no-store" }).then((x) => x.json());
        if (r.events?.serverNow) {
          syncClock(r.events.serverNow);
          setTl(r.events);
        }
        if (r.items?.length) {
          last.current = r.items[0].id;
          setItems((cur) => [...r.items, ...cur].slice(0, 20));
          const big = r.items.find((i: Item) => i.kind === "pull" && (i.data.rarity === "legendary" || i.data.rarity === "epic"));
          setFresh(r.items[0].id);
          if (big) sfx.pop();
          setTimeout(() => setFresh(null), 4000);
        }
      } catch {}
    }, 10_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, []);

  // Event boundary crossed on the server clock -> refresh so odds/rewards on the page update.
  useEffect(() => {
    if (!mounted) return;
    const edges = [...tl.active.map((e) => e.ends_at), tl.next?.starts_at].filter(Boolean) as string[];
    const passed = edges.find((t) => Date.parse(t) <= now);
    if (passed && boundary.current !== passed) {
      boundary.current = passed;
      setTimeout(() => router.refresh(), 800);
      fetch("/api/events", { cache: "no-store" })
        .then((x) => x.json())
        .then((r) => r.ok && setTl(r))
        .catch(() => {});
    }
  }, [now, tl, mounted, router]);

  const ev = tl.active[0];
  const style = ev ? (EVENT_STYLE[ev.kind] ?? EVENT_STYLE.custom) : null;

  return (
    <div className={`border-b-[3px] border-black ${compact ? "" : "bg-[#11140c]/90 backdrop-blur"}`}>
      <div className="mx-auto flex max-w-6xl items-stretch gap-0 overflow-hidden">
        {/* event */}
        <div className="flex shrink-0 items-center gap-2 border-r-[3px] border-black px-3 py-1.5" style={ev ? { background: style!.color, color: "#000" } : undefined}>
          {ev ? <TbBolt size={16} strokeWidth={2.6} className="anim-wiggle" /> : <TbClock size={15} className="text-muted" />}
          <span className="display whitespace-nowrap text-xs">
            {ev ? (
              <>
                {ev.name}
                {tl.active.length > 1 ? ` +${tl.active.length - 1}` : ""} <span className="opacity-70">· ends {mounted ? fmtDuration(Date.parse(ev.ends_at) - now) : "…"}</span>
              </>
            ) : tl.next ? (
              <span className="text-muted">
                {tl.next.name} in <span className="text-text">{mounted ? fmtDuration(Date.parse(tl.next.starts_at) - now) : "…"}</span>
              </span>
            ) : (
              <span className="text-muted">No events scheduled</span>
            )}
          </span>
        </div>
        {/* ticker */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {items.length === 0 ? (
            <div className="px-3 py-1.5 text-xs text-muted">Quiet in the city. Be the first big pull.</div>
          ) : (
            <div className="flex w-max anim-marquee items-center" style={{ animationDuration: `${Math.max(30, items.length * 6)}s` }}>
              {[0, 1].map((k) => (
                <div key={k} className="flex items-center" aria-hidden={k === 1}>
                  {items.map((i) => (
                    <FeedLine key={`${k}-${i.id}`} item={i} fresh={fresh === i.id} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedLine({ item, fresh }: { item: Item; fresh: boolean }) {
  const d = item.data;
  let icon: React.ReactNode = null;
  let text: React.ReactNode = null;
  if (item.kind === "pull") {
    const t = d.type as FragmentType;
    const r = d.rarity as Rarity;
    icon = <FragmentIcon type={t} size={18} />;
    text = (
      <>
        pulled <b style={{ color: RARITY_COLOR[r] }}>{r === "legendary" ? "a LEGENDARY " : r === "epic" ? "an Epic " : "a Rare "}{FRAGMENT_BY_TYPE[t]?.name}</b>
      </>
    );
  } else if (item.kind === "forge") {
    icon = <TbFlask2 size={16} className="text-accent" />;
    text = <b className="text-accent">assembled a Nottie</b>;
  } else if (item.kind === "swap") {
    icon = <TbArrowsExchange size={16} className="text-[#8ad7ff]" />;
    text = <>swapped for {FRAGMENT_BY_TYPE[d.give as FragmentType]?.name}</>;
  } else if (item.kind === "streak") {
    icon = <TbFlame size={16} className="text-warn" />;
    text = <>hit a <b className="text-warn">{String(d.days)}-day streak</b></>;
  } else if (item.kind === "book") {
    icon = <FragmentIcon type="book" size={18} />;
    text = <b style={{ color: RARITY_COLOR.legendary }}>earned Vlad&apos;s Book</b>;
  } else if (item.kind === "faction") {
    const f = FACTIONS.find((x) => x.id === d.faction);
    icon = <TbUsers size={16} style={{ color: f?.color }} />;
    text = <>joined <b style={{ color: f?.color }}>{f?.name}</b></>;
  }
  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 text-xs ${fresh ? "anim-pop" : ""}`}>
      {icon}
      <b className="text-text">@{item.username}</b>
      <span className="text-muted">{text}</span>
      <span className="ml-3 text-white/20">●</span>
    </span>
  );
}
