"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PlayerView } from "@/lib/game/core";
import { levelInfo } from "@/lib/game/level";
import { fmtDuration, timeLeft , serverNow} from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { Coin } from "./game/Coin";
import { CountUp } from "./game/CountUp";
import { SoundToggle } from "./game/SoundToggle";
import { useMounted } from "./useMounted";
import { TbArrowsExchange, TbBox, TbClipboardCheck, TbFlame, TbFlask2, TbMap2, TbMenu2, TbPhoto, TbPlayerPlayFilled, TbLogout, TbExternalLink, TbMail, TbX, TbCoin, TbBuildingStore, TbUserCircle, TbMessages } from "react-icons/tb";
import { BRAND, FACTIONS } from "@/lib/game/config";
import type { IconType } from "react-icons";
import { replayIntro } from "./game/IntroStory";
import { MusicToggle } from "./game/MusicPlayer";

const MAIN: { href: string; label: string; icon: IconType }[] = [
  { href: "/dashboard", label: "City", icon: TbMap2 },
  { href: "/hunt", label: "Hunt", icon: TbBox },
  { href: "/trade", label: "Market", icon: TbBuildingStore },
  { href: "/forge", label: "Forge", icon: TbFlask2 },
  { href: "/tasks", label: "Missions", icon: TbCoin },
  { href: "/chat", label: "Chat", icon: TbMessages },
  { href: "/profile", label: "Profile", icon: TbUserCircle },
];
const MORE = [
  { href: "/play", label: "🎮 Lab Escape (game)" },
  { href: "/trade", label: "Market" },
  { href: "/chat", label: "Announcements & chat" },
  { href: "/forge", label: "Vlad's Lab (Forge)" },
  { href: "/showroom", label: "Gallery" },
  { href: "/mail", label: "Mailbox" },
  { href: "/inventory", label: "Stash" },
  { href: "/leaderboard", label: "Most Wanted" },
  { href: "/referrals", label: "Recruit" },
  { href: "/wallet", label: "Getaway Wallet" },
  { href: "/settings", label: "Settings" },
  { href: "/wiki", label: "Field Guide (how to play)" },
];

export function Nav({ player }: { player: PlayerView }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const lv = levelInfo(player.lifetimePoints);

  return (
    <>
      <LevelUpWatcher level={lv.level} title={lv.title} />
      <MailPing count={player.mail} hidden={path === "/mail"} />
      <header className="relative z-40 border-b-[3px] border-black bg-[#151910]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          {/* player plate */}
          <Link href="/profile" className="group flex min-w-0 shrink-0 items-center gap-2" onClick={() => sfx.click()} title="Your profile">
            <div className="relative shrink-0">
              <Avatar src={player.avatar} name={player.username} size={42} ring />
              <span className="display absolute -bottom-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full border-[3px] border-black bg-accent px-1 text-[11px] leading-none text-black">{lv.level}</span>
            </div>
            <div className="hidden min-w-0 sm:block lg:hidden 2xl:block">
              <div className="flex items-baseline gap-2">
                <span className="display truncate text-sm leading-none">@{player.username}</span>
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                {lv.title}
                {player.faction && <span style={{ color: FACTIONS.find((f) => f.id === player.faction)?.color }}> · {FACTIONS.find((f) => f.id === player.faction)?.name}</span>}
              </div>
              <div className="mt-1 h-2 w-28 overflow-hidden rounded-full border-2 border-black bg-black/60" title={`${lv.into}/${lv.span} XP to level ${lv.level + 1}`}>
                <div className="h-full bg-accent" style={{ width: `${lv.pct}%` }} />
              </div>
            </div>
          </Link>

          {/* desktop nav */}
          <nav className="ml-1 hidden items-center gap-1 lg:flex">
            {MAIN.filter((m) => m.href !== "/chat").map((m) => {
              const active = path.startsWith(m.href);
              return (
                <Link key={m.href} href={m.href} title={m.label} aria-label={m.label} onClick={() => sfx.click()} className={`display flex items-center gap-1.5 rounded-xl border-[3px] px-2.5 py-1.5 text-xs tracking-wider transition xl:px-3 xl:text-sm ${active ? "-translate-y-0.5 border-black bg-accent text-black shadow-[0_4px_0_#000]" : "border-transparent text-muted hover:-translate-y-0.5 hover:border-black hover:bg-raised hover:text-text hover:shadow-[0_4px_0_#000]"}`}>
                  <m.icon size={17} strokeWidth={active ? 2.6 : 2.2} />
                  <span className="hidden xl:inline">{m.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <CrateChip at={player.crateAt} crates={player.crates} />
            <Link href="/tasks" title={player.checkedInToday ? `${player.streak}-day streak. Back tomorrow!` : player.streak ? `${player.streak}-day streak. Roll call to keep it!` : "Start a streak at roll call"} className={`hidden items-center gap-1 rounded-full border-[3px] border-black py-1 pl-1.5 pr-2.5 shadow-[0_3px_0_#000] sm:flex ${player.checkedInToday ? "bg-warn text-black" : "bg-black/50 text-muted"}`}>
              <TbFlame size={18} strokeWidth={2.4} className={!player.checkedInToday && player.streak ? "anim-wiggle text-warn" : ""} />
              <span className="display text-sm tabular-nums">{player.streak}</span>
            </Link>
            <Link href="/inventory" className="flex items-center gap-1.5 rounded-full border-[3px] border-black bg-black/50 py-1 pl-1 pr-3 shadow-[0_3px_0_#000]" title="$NOTTIES">
              <Coin size={26} />
              <CountUp value={player.points} className="display text-sm" />
            </Link>
            <ChatIcon latest={player.latestAnnouncement} active={path === "/chat"} />
            <Link
              href="/mail"
              onClick={() => sfx.click()}
              aria-label={player.mail ? `Mailbox, ${player.mail} new` : "Mailbox"}
              title="Mailbox"
              className={`relative grid h-10 w-10 place-items-center rounded-full border-[3px] border-black shadow-[0_3px_0_#000] transition active:translate-y-[3px] active:shadow-none ${path === "/mail" ? "bg-accent text-black" : player.mail ? "bg-warn text-black" : "bg-raised"}`}
            >
              <TbMail size={20} strokeWidth={2.4} className={player.mail && path !== "/mail" ? "anim-wiggle" : ""} />
              {player.mail > 0 && (
                <span className="display absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-black bg-[#ff5d4d] px-1 text-[11px] leading-none text-white">{player.mail > 99 ? "99+" : player.mail}</span>
              )}
            </Link>
            <SoundToggle className="hidden sm:grid" />
            <div className="relative">
              <button
                onClick={() => {
                  setOpen((v) => !v);
                  sfx.click();
                }}
                className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-black bg-raised shadow-[0_3px_0_#000] transition active:translate-y-[3px] active:shadow-none"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Menu"
              >
                <TbMenu2 size={19} strokeWidth={2.6} />
              </button>
              {open && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} />
                  <div className="card absolute right-0 top-full z-50 mt-3 w-64 p-2 anim-pop" role="menu">
                    <div className="flex items-center gap-3 p-2">
                      <Avatar src={player.avatar} name={player.username} size={40} />
                      <div className="min-w-0">
                        <div className="display truncate text-sm">@{player.username}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-accent">
                          Lv {lv.level} · {lv.title}
                        </div>
                      </div>
                    </div>
                    <div className="mx-2 mb-2 h-2.5 overflow-hidden rounded-full border-2 border-black bg-black/60">
                      <div className="h-full bg-accent" style={{ width: `${lv.pct}%` }} />
                    </div>
                    {MORE.filter((m) => m.href !== "/play" || player.canPlay).map((m) => (
                      <Link key={m.href} href={m.href} role="menuitem" onClick={() => setOpen(false)} className={`display block rounded-xl px-3 py-2.5 text-sm tracking-wide hover:bg-raised ${path === m.href ? "text-accent" : ""}`}>
                        {m.label}
                      </Link>
                    ))}
                    <a href={BRAND.site} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setOpen(false)} className="display flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm tracking-wide hover:bg-raised">
                      thenotties.xyz <TbExternalLink size={14} />
                    </a>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        replayIntro();
                      }}
                      className="display block w-full rounded-xl px-3 py-2.5 text-left text-sm tracking-wide hover:bg-raised"
                    >
                      <span className="flex items-center gap-2">
                        <TbPlayerPlayFilled size={14} /> Replay intro
                      </span>
                    </button>
                    <MusicToggle className="display block w-full rounded-xl px-3 py-2.5 text-left text-sm tracking-wide hover:bg-raised" />
                    <div className="flex items-center justify-between px-3 py-2 sm:hidden">
                      <span className="display text-sm">Sound</span>
                      <SoundToggle />
                    </div>
                    <div className="my-1 h-[3px] rounded bg-black" />
                    <form action="/api/x/logout" method="post">
                      <button className="display flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-raised hover:text-error" role="menuitem">
                        <TbLogout size={16} /> Sign out
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* mobile bottom bar: big raised Hunt button in the middle */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-black bg-[#151910]/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid grid-cols-5 items-end">
          {[MAIN[0], MAIN[3], MAIN[1], MAIN[4], MAIN[6]].map((m) => {
            const active = path.startsWith(m.href);
            if (m.href === "/hunt")
              return (
                <li key={m.href} className="flex justify-center">
                  <Link href={m.href} onClick={() => sfx.click()} className={`relative -mt-7 mb-1 flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full border-[3px] border-black text-black shadow-[0_5px_0_#000] transition active:translate-y-[5px] active:shadow-none ${active ? "bg-accent-hover" : "bg-accent"}`}>
                    <TbBox size={28} strokeWidth={2.4} />
                    <span className="display text-[10px] leading-none">Hunt</span>
                    <ReadyDot at={player.crateAt} crates={player.crates} />
                  </Link>
                </li>
              );
            return (
              <li key={m.href}>
                <Link href={m.href} onClick={() => sfx.click()} className={`display flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[10px] tracking-wider ${active ? "text-accent" : "text-muted"}`}>
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "border-2 border-black bg-accent text-black" : ""}`}>
                    <m.icon size={18} strokeWidth={active ? 2.6 : 2.2} />
                  </span>
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function CrateChip({ at, crates }: { at: string | null | "need"; crates: number }) {
  const mounted = useMounted();
  const now = useNow();
  const need = at === "need";
  const nextClaimAt = need ? null : at;
  const left = mounted && !need ? timeLeft(nextClaimAt, now) : 1;
  const ready = mounted && !need && left === 0;
  useEffect(() => {
    if (!mounted) return;
    const base = document.title.replace(/^\(!\) Crate ready · /, "");
    document.title = ready ? `(!) Crate ready · ${base}` : base;
  }, [ready, mounted]);
  useCrateNotification(nextClaimAt);
  return (
    <Link href={need && crates === 0 ? "/trade" : "/hunt"} onClick={() => sfx.click()} className={`relative hidden items-center gap-1.5 rounded-full border-[3px] border-black px-3 py-1.5 shadow-[0_3px_0_#000] sm:flex ${ready ? "anim-glow bg-accent text-black" : "bg-black/50 text-muted"}`}>
      <TbBox size={16} strokeWidth={2.4} />
      <span className="display whitespace-nowrap text-xs tabular-nums">{!mounted ? "…" : crates > 0 ? `${crates} crate${crates === 1 ? "" : "s"}` : need ? "0 crates" : ready ? "Ready!" : fmtDuration(left).replace(/ \d+s$/, "")}</span>
    </Link>
  );
}

function ReadyDot({ at, crates }: { at: string | null | "need"; crates: number }) {
  const mounted = useMounted();
  const now = useNow();
  if (crates > 0) return <span className="display absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border-[3px] border-black bg-[#ff5d4d] px-1 text-[11px] leading-none text-white">{crates > 99 ? "99+" : crates}</span>;
  if (!mounted || at === "need" || timeLeft(at, now) > 0) return null;
  return <span className="ping-ring absolute -right-0.5 -top-0.5 h-5 w-5 rounded-full border-[3px] border-black bg-[#ff5d4d]" />;
}

/** Chat & announcements button; a red dot means an announcement you haven't opened yet. */
function ChatIcon({ latest, active }: { latest: number; active: boolean }) {
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem("nt_ann_seen") || 0);
      if (active) localStorage.setItem("nt_ann_seen", String(latest));
    } catch {}
    const t = setTimeout(() => setUnseen(!active && latest > seen), 0);
    return () => clearTimeout(t);
  }, [latest, active]);
  return (
    <Link href={unseen ? "/chat?tab=announce" : "/chat"} onClick={() => sfx.click()} aria-label={unseen ? "Chat, new announcement" : "Chat"} title="Announcements & chat" className={`relative grid h-10 w-10 place-items-center rounded-full border-[3px] border-black shadow-[0_3px_0_#000] transition active:translate-y-[3px] active:shadow-none ${active ? "bg-accent text-black" : "bg-raised"}`}>
      <TbMessages size={19} strokeWidth={2.4} />
      {unseen && <span className="ping-ring absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-black bg-[#ff5d4d]" />}
    </Link>
  );
}

/**
 * A pop-up when new mail arrives: compares the unread count with the last one this browser
 * acknowledged, so it shows once per new letter rather than on every page.
 */
function MailPing({ count, hidden }: { count: number; hidden: boolean }) {
  const [show, setShow] = useState(0);
  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem("nt_mail_seen") || 0);
      // Count went down (claimed/read): remember the lower number so the next letter pops again.
      if (count < seen || hidden) localStorage.setItem("nt_mail_seen", String(count));
    } catch {}
    const pop = !hidden && count > seen;
    const t = setTimeout(
      () => {
        setShow(pop ? count : 0);
        if (pop) sfx.pop();
      },
      pop ? 900 : 0,
    );
    return () => clearTimeout(t);
  }, [count, hidden]);
  const dismiss = () => {
    try {
      localStorage.setItem("nt_mail_seen", String(count));
    } catch {}
    setShow(0);
  };
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-sm anim-pop lg:bottom-auto lg:left-auto lg:right-6 lg:top-20 lg:mx-0" role="status">
      <div className="card card-lime flex items-center gap-3 p-3 text-black">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-black text-accent">
          <TbMail size={22} />
          <span className="display absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-black bg-[#ff5d4d] px-1 text-xs text-white">{show}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="display leading-tight">You&apos;ve got mail!</div>
          <div className="text-xs font-semibold text-black/70">
            {show} letter{show === 1 ? "" : "s"} waiting. Rewards inside.
          </div>
        </div>
        <Link href="/mail" onClick={dismiss} className="btn !min-h-[40px] border-black bg-black !px-3 text-sm text-accent">
          Open
        </Link>
        <button onClick={dismiss} aria-label="Dismiss" className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/10">
          <TbX size={18} />
        </button>
      </div>
    </div>
  );
}

/** Remembers the last level this browser saw; when it goes up, throws a party. */
function LevelUpWatcher({ level, title }: { level: number; title: string }) {
  const [show, setShow] = useState<number | null>(null);
  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem("nt_lvl") || 0);
      localStorage.setItem("nt_lvl", String(level));
    } catch {}
    if (seen && level > seen) {
      const t = setTimeout(() => {
        setShow(level);
        sfx.levelUp();
        fx.burst({ count: 160, power: 16 });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [level]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShow(null)}>
      <div className="card card-lime relative w-full max-w-sm overflow-hidden p-8 text-center anim-pop">
        <div className="beams" style={{ ["--beam" as string]: "#fff" }} />
        <div className="relative">
          <div className="display text-sm tracking-[0.3em]">Level up!</div>
          <div className="display ink-text mt-1 text-8xl leading-none text-white">{show}</div>
          <div className="display mt-2 text-2xl">{title}</div>
          <p className="mt-2 text-sm font-semibold">More trouble caused. Vlad is getting nervous.</p>
          <button className="btn btn-ghost mt-5" onClick={() => setShow(null)}>
            Let&apos;s go
          </button>
        </div>
      </div>
    </div>
  );
}

export function Avatar({ src, name, size = 32, ring = false }: { src: string | null; name: string; size?: number; ring?: boolean }) {
  const cls = `rounded-full object-cover ${ring ? "border-[3px] border-black shadow-[0_3px_0_#000]" : "border-2 border-black"}`;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={`bg-raised ${cls}`} style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <span className={`display grid place-items-center bg-accent text-black ${cls}`} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export { Image };

/** Optional browser ping when the crate is ready (Settings → notifications). Only while a tab is open. */
function useCrateNotification(nextClaimAt: string | null) {
  useEffect(() => {
    let on = false;
    try {
      on = localStorage.getItem("nt_notify") === "1";
    } catch {}
    if (!on || typeof Notification === "undefined" || Notification.permission !== "granted" || !nextClaimAt) return;
    const ms = timeLeft(nextClaimAt);
    if (ms <= 0 || ms > 6 * 3600_000) return;
    const t = setTimeout(() => {
      try {
        new Notification("Your crate is ready", { body: "A Portal Crate just washed up. Go crack it.", icon: "/brand/logo.png", tag: "nt-crate" });
      } catch {}
    }, ms + 500);
    return () => clearTimeout(t);
  }, [nextClaimAt]);
}
