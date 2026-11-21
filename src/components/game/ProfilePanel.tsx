"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import { TbArrowsExchange, TbBox, TbClipboardCheck, TbFlask2, TbMail, TbSend, TbTrophy, TbUsers, TbWallet, TbMessages } from "react-icons/tb";
import { api, idem } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { FACTIONS, PARTS, type FragmentType } from "@/lib/game/config";
import { FragmentIcon } from "../FragmentIcon";
import { CopyButton } from "../CopyButton";
import { Avatar } from "../Nav";
import { Coin } from "./Coin";
import type { Activity } from "@/lib/game/profile";
import { FRAGMENT_BY_TYPE } from "@/lib/game/config";

export type ProfileData = {
  username: string;
  avatar: string | null;
  level: number;
  title: string;
  faction: string | null;
  points: number;
  fragments: number;
  have: number;
  need: number;
  inventory: Record<FragmentType, number>;
  refLink: string;
  refCode: string;
  recruits: number;
  recruitsPending: number;
  recruitList: { username: string; status: string; at: string }[];
  recruitPoints: number;
  referred: boolean;
  mail: number;
  suspended: boolean;
  history: Activity[];
};

const NAV: { href: string; label: string; icon: IconType }[] = [
  { href: "/hunt", label: "Hunt", icon: TbBox },
  { href: "/forge", label: "Forge", icon: TbFlask2 },
  { href: "/trade", label: "Market", icon: TbArrowsExchange },
  { href: "/tasks", label: "Earn", icon: TbClipboardCheck },
  { href: "/mail", label: "Mailbox", icon: TbMail },
  { href: "/wallet", label: "Wallet", icon: TbWallet },
  { href: "/referrals", label: "Recruit", icon: TbUsers },
  { href: "/leaderboard", label: "Most Wanted", icon: TbTrophy },
  { href: "/chat", label: "Chat", icon: TbMessages },
];

/** Everything about the player in one place: balance, parts, referral link, transfers and shortcuts. */
export function ProfilePanel({ d }: { d: ProfileData }) {
  const faction = FACTIONS.find((f) => f.id === d.faction);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        {/* who */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <Avatar src={d.avatar} name={d.username} size={64} ring />
            <div className="min-w-0">
              <div className="display truncate text-2xl">@{d.username}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-accent">
                Lv {d.level} · {d.title}
                {faction && <span style={{ color: faction.color }}> · {faction.name}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border-[3px] border-black bg-black/40 p-2 text-center sm:p-3">
              <div className="display flex items-center justify-center gap-1 text-xl text-accent sm:text-2xl">
                <Coin size={20} /> {d.points.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">$NOTTIES</div>
            </div>
            <div className="rounded-xl border-[3px] border-black bg-black/40 p-2 text-center sm:p-3">
              <div className="display text-xl sm:text-2xl">{d.fragments}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Fragments · {d.have}/{d.need} set
              </div>
            </div>
            <a href="#referrals" className="rounded-xl border-[3px] border-black bg-black/40 p-2 text-center sm:p-3 transition hover:-translate-y-0.5">
              <div className="display text-xl sm:text-2xl">{d.recruitList.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Referrals · {d.recruits} paid</div>
            </a>
          </div>
          <Link href="/tasks" className="btn btn-accent mt-3 w-full">
            <Coin size={18} /> Earn more $NOTTIES
          </Link>
        </div>

        {/* inventory */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between">
            <div className="display text-xl">Inventory</div>
            <span className="text-xs text-muted">Tap a part to send it</span>
          </div>
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {PARTS.map((f) => {
              const n = d.inventory[f.type] ?? 0;
              const inner = (
                <>
                  <span style={n ? undefined : { filter: "brightness(0) invert(.3)" }}>
                    <FragmentIcon type={f.type} size={38} />
                  </span>
                  <span className="mt-1 w-full truncate text-center text-[10px] text-muted">{f.name}</span>
                  <span className={`display text-lg leading-none ${n ? "text-accent" : "text-white/30"}`}>{n}</span>
                </>
              );
              return (
                <li key={f.type}>
                  {n > 0 ? (
                    <Link href={`/trade?tab=gift&type=${f.type}`} className="flex flex-col items-center rounded-xl border-2 border-black bg-black/40 p-2 transition hover:-translate-y-0.5 hover:border-accent">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center rounded-xl border-2 border-black bg-black/20 p-2">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        {/* referral */}
        <div className="card p-5">
          <div id="referrals" className="display scroll-mt-32 text-xl">Referral</div>
          <p className="mt-1 text-sm text-muted">Invite friends. You earn $NOTTIES once they join and like our launch tweet.{" "}
            {(d.recruits > 0 || d.recruitsPending > 0) && (
              <b className="text-white">
                {d.recruits} paid{d.recruitsPending ? `, ${d.recruitsPending} waiting for them to like the tweet` : ""}.
              </b>
            )}</p>
          <div className="mt-3 rounded-xl border-2 border-black bg-black/40 p-3">
            <div className="break-all font-mono text-xs text-accent">{d.refLink}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted">Your link · code {d.refCode}</div>
          </div>
          <CopyButton text={d.refLink} label="Copy link" className="btn btn-accent mt-3 w-full" />
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="display text-sm">People you referred ({d.recruitList.length})</span>
              {d.recruitPoints > 0 && (
                <span className="display flex items-center gap-1 text-xs text-accent">
                  <Coin size={13} /> +{d.recruitPoints.toLocaleString()} earned
                </span>
              )}
            </div>
            {d.recruitList.length === 0 ? (
              <p className="mt-1 text-xs text-muted">No one yet. Share your link to start earning.</p>
            ) : (
              <ul className="mt-2 max-h-56 divide-y-2 divide-black/60 overflow-y-auto rounded-xl border-2 border-black bg-black/30">
                {d.recruitList.map((r) => (
                  <li key={r.username} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="truncate">@{r.username}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.status === "verified" ? "bg-accent text-black" : "bg-raised text-muted"}`}>{r.status === "verified" ? "paid" : r.status === "pending" ? "waiting" : r.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {d.recruitsPending > 0 && <p className="mt-1 text-xs text-muted">&quot;Waiting&quot; means they haven&apos;t liked our launch tweet yet. You get paid the moment they do.</p>}
          </div>
          {!d.referred && <ReferralCode suspended={d.suspended} />}
        </div>

        <SendTokens suspended={d.suspended} balance={d.points} />

        <History items={d.history} />

        {/* shortcuts */}
        <nav className="card grid grid-cols-2 gap-2 p-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => sfx.click()} className="display relative flex items-center gap-2 rounded-xl border-2 border-black bg-black/30 px-3 py-3 text-sm tracking-wide hover:bg-raised">
              <n.icon size={18} className="text-accent" /> {n.label}
              {n.href === "/mail" && d.mail > 0 && <span className="display ml-auto grid h-5 min-w-5 place-items-center rounded-full border-2 border-black bg-[#ff5d4d] px-1 text-[11px] text-white">{d.mail}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ReferralCode({ suspended }: { suspended: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function use() {
    setBusy(true);
    setMsg(null);
    try {
      const { result } = await api<{ result: { referrer: string } }>("/api/profile", { action: "code", code });
      setMsg({ ok: true, text: `Done. @${result.referrer} is your recruiter.` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't use that code" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4">
      <div className="text-xs font-bold text-muted">Did a friend invite you? Enter their code:</div>
      <div className="mt-2 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" autoCapitalize="characters" className="min-w-0 flex-1 font-mono" aria-label="Friend's referral code" />
        <button onClick={use} disabled={busy || suspended || code.trim().length < 3} className="btn btn-ghost shrink-0">
          {busy ? "…" : "Use"}
        </button>
      </div>
      {msg && <div className={`mt-2 text-sm font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</div>}
    </div>
  );
}

function SendTokens({ suspended, balance }: { suspended: boolean; balance: number }) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = Math.floor(Number(amount));
  const valid = to.trim().length > 1 && n > 0 && n <= balance;

  async function send(el: HTMLButtonElement) {
    setBusy(true);
    setMsg(null);
    try {
      const { result } = await api<{ result: { to: string; amount: number } }>("/api/profile", { action: "send", to: to.trim(), amount: n, idem: idem() });
      sfx.coin();
      fx.burst({ at: el, count: 40, power: 9, colors: ["#cdff00", "#ffffff"] });
      setMsg({ ok: true, text: `Sent ${result.amount.toLocaleString()} $NOTTIES to @${result.to}.` });
      setTo("");
      setAmount("");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      sfx.error();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't send" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="display text-xl">Send</div>
      <p className="mt-1 text-sm text-muted">
        Send $NOTTIES to a friend, or{" "}
        <Link href="/trade?tab=gift" className="font-bold text-accent underline">
          send a card
        </Link>
        .
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px]">
        <input value={to} onChange={(e) => (setTo(e.target.value), setConfirm(false))} placeholder="@username or player code" autoCapitalize="off" aria-label="Send to" />
        <input value={amount} onChange={(e) => (setAmount(e.target.value.replace(/\D/g, "")), setConfirm(false))} placeholder="Amount" inputMode="numeric" aria-label="Amount of $NOTTIES" />
      </div>
      {!confirm ? (
        <button onClick={() => setConfirm(true)} disabled={!valid || suspended} className="btn btn-ghost mt-3 w-full">
          <TbSend size={17} /> Send $NOTTIES
        </button>
      ) : (
        <div className="mt-3 rounded-xl border-2 border-warn bg-black/40 p-3 text-sm">
          Send <b className="text-accent">{n.toLocaleString()} $NOTTIES</b> to <b>@{to.trim().replace(/^@/, "")}</b>? There&apos;s no undo.
          <div className="mt-2 flex gap-2">
            <button onClick={(e) => send(e.currentTarget)} disabled={busy} className="btn btn-accent flex-1">
              {busy ? "Sending…" : "Yes, send"}
            </button>
            <button onClick={() => setConfirm(false)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}
      {n > balance && amount && <div className="mt-2 text-xs font-bold text-error">You only have {balance.toLocaleString()} $NOTTIES.</div>}
      {msg && <div className={`mt-2 text-sm font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</div>}
    </div>
  );
}

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Transfers, gifts, swaps and Market buys. */
function History({ items }: { items: Activity[] }) {
  const name = (t?: string) => (t ? (FRAGMENT_BY_TYPE[t as FragmentType]?.name ?? t) : "");
  return (
    <div className="card p-5">
      <div className="display text-xl">Transfer &amp; trade history</div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing yet. $NOTTIES and cards you send or receive, swaps and Market buys show up here.</p>
      ) : (
        <ul className="mt-3 divide-y-2 divide-black/60">
          {items.map((a, i) => {
            const icon = a.kind === "sent_points" || a.kind === "got_points" ? <Coin size={24} /> : <FragmentIcon type={(a.got ?? a.type) as FragmentType} size={26} />;
            const line =
              a.kind === "sent_points" ? <>Sent <b className="text-white">{a.points?.toLocaleString()} $NOTTIES</b> to @{a.other}</>
              : a.kind === "got_points" ? <>Got <b className="text-accent">{a.points?.toLocaleString()} $NOTTIES</b> from @{a.other}</>
              : a.kind === "sent_card" ? <>Sent <b className="text-white">{a.qty} × {name(a.type)}</b> to @{a.other}</>
              : a.kind === "got_card" ? <>Got <b className="text-accent">{a.qty} × {name(a.type)}</b> from @{a.other}</>
              : a.kind === "swap" ? <>Swapped {a.qty} × {name(a.type)} for <b className="text-accent">{a.gotQty} × {name(a.got)}</b> with @{a.other}</>
              : <>Bought <b className="text-accent">{name(a.type)}</b> in the Market for {a.points?.toLocaleString()} $NOTTIES</>;
            return (
              <li key={i} className="flex items-center gap-3 py-2 text-sm text-muted">
                <span className="grid w-7 shrink-0 place-items-center">{icon}</span>
                <span className="min-w-0 flex-1">{line}</span>
                <span className="shrink-0 text-xs" suppressHydrationWarning>
                  {ago(a.at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
