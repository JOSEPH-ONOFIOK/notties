"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import { TbArrowsExchange, TbBox, TbClipboardCheck, TbFlask2, TbMail, TbSend, TbTrophy, TbUsers, TbWallet } from "react-icons/tb";
import { api, idem } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { FACTIONS, PARTS, type FragmentType } from "@/lib/game/config";
import { FragmentIcon } from "../FragmentIcon";
import { CopyButton } from "../CopyButton";
import { Avatar } from "../Nav";
import { Coin } from "./Coin";

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
  referred: boolean;
  mail: number;
  suspended: boolean;
};

const NAV: { href: string; label: string; icon: IconType }[] = [
  { href: "/hunt", label: "Hunt", icon: TbBox },
  { href: "/forge", label: "Forge", icon: TbFlask2 },
  { href: "/trade", label: "Trade", icon: TbArrowsExchange },
  { href: "/tasks", label: "Earn", icon: TbClipboardCheck },
  { href: "/mail", label: "Mailbox", icon: TbMail },
  { href: "/wallet", label: "Wallet", icon: TbWallet },
  { href: "/referrals", label: "Recruit", icon: TbUsers },
  { href: "/leaderboard", label: "Most Wanted", icon: TbTrophy },
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
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border-[3px] border-black bg-black/40 p-3 text-center">
              <div className="display flex items-center justify-center gap-1.5 text-2xl text-accent">
                <Coin size={22} /> {d.points.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">$NOTTIES</div>
            </div>
            <div className="rounded-xl border-[3px] border-black bg-black/40 p-3 text-center">
              <div className="display text-2xl">{d.fragments}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Fragments · {d.have}/{d.need} set
              </div>
            </div>
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
          <div className="display text-xl">Referral</div>
          <p className="mt-1 text-sm text-muted">Invite friends. When they join and play, you earn $NOTTIES. {d.recruits > 0 && <b className="text-white">{d.recruits} recruited so far.</b>}</p>
          <div className="mt-3 rounded-xl border-2 border-black bg-black/40 p-3">
            <div className="break-all font-mono text-xs text-accent">{d.refLink}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted">Your link · code {d.refCode}</div>
          </div>
          <CopyButton text={d.refLink} label="Copy link" className="btn btn-accent mt-3 w-full" />
          {!d.referred && <ReferralCode suspended={d.suspended} />}
        </div>

        <SendTokens suspended={d.suspended} balance={d.points} />

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
