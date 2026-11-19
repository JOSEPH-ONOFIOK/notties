"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import { TbAlertTriangle, TbArrowsExchange, TbBox, TbCheck, TbGift, TbMail, TbUsers } from "react-icons/tb";
import { api } from "@/lib/client";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import type { FragmentType } from "@/lib/game/config";
import type { Mail } from "@/lib/game/mail";
import { FragmentIcon } from "../FragmentIcon";
import { Coin } from "./Coin";

const ICON: Record<string, IconType> = { reward: TbGift, referral: TbUsers, welcome: TbMail, gift: TbArrowsExchange, swap: TbArrowsExchange, review: TbAlertTriangle, system: TbMail };

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Mailbox({ initial, suspended }: { initial: Mail[]; suspended: boolean }) {
  const router = useRouter();
  const [mail, setMail] = useState(initial);
  const [from, setFrom] = useState(initial);
  if (from !== initial) {
    setFrom(initial);
    setMail(initial);
  }
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [got, setGot] = useState<{ points: number; crates: number } | null>(null);
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const waiting = mail.filter((m) => !m.claimed);

  // Opening the mailbox reads every letter; refresh so the badge in the top bar updates.
  useEffect(() => {
    if (!initial.some((m) => !m.read)) return;
    api("/api/mail", { action: "read" })
      .then(() => router.refresh())
      .catch(() => {});
  }, [initial, router]);

  async function claim(id?: string) {
    setBusy(id ?? "all");
    setError(null);
    try {
      const { result } = await api<{ result: { points: number; crates: number } }>("/api/mail", id ? { action: "claim", id } : { action: "claimAll" });
      const el = id ? btns.current[id] : btns.current.all;
      sfx.coin();
      fx.burst({ at: el, count: 50, power: 10, colors: ["#cdff00", "#ffffff", "#ffd166"] });
      if (result.points) fx.float(`+${result.points}`, { at: el });
      setMail((ms) => ms.map((m) => (!id || m.id === id ? { ...m, claimed: true, read: true } : m)));
      setGot((g) => ({ points: (g?.points ?? 0) + result.points, crates: (g?.crates ?? 0) + result.crates }));
      router.refresh();
    } catch (e) {
      sfx.error();
      setError(e instanceof Error ? e.message : "Couldn't claim");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {got && got.crates > 0 && (
        <div className="card card-lime flex flex-wrap items-center justify-between gap-3 p-4 text-black anim-pop">
          <div className="flex items-center gap-3">
            <TbBox size={30} strokeWidth={2.2} />
            <div>
              <div className="display text-xl leading-tight">
                {got.crates} free crate{got.crates === 1 ? "" : "s"} ready
              </div>
              <div className="text-sm font-semibold text-black/70">They&apos;re waiting on the Hunt page. No timer.</div>
            </div>
          </div>
          <Link href="/hunt" className="btn border-black bg-black text-accent">
            Open them
          </Link>
        </div>
      )}

      {waiting.length > 1 && (
        <div className="flex justify-end">
          <button ref={(el) => void (btns.current.all = el)} onClick={() => claim()} disabled={suspended || !!busy} className="btn btn-accent">
            <TbGift size={18} /> {busy === "all" ? "Claiming…" : `Claim all (${waiting.length})`}
          </button>
        </div>
      )}
      {error && (
        <div className="text-sm font-bold text-error" role="alert">
          {error}
        </div>
      )}

      {mail.length === 0 ? (
        <div className="card p-8 text-center">
          <TbMail size={40} className="mx-auto text-muted" />
          <div className="display mt-2 text-xl">No mail yet</div>
          <p className="mt-1 text-sm text-muted">Finish missions and recruit friends. Rewards land here.</p>
          <Link href="/tasks" className="btn btn-accent mt-4">
            Open missions
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {mail.map((m) => {
            const Icon = ICON[m.kind] ?? TbMail;
            const reward = m.points > 0 || m.crates > 0;
            return (
              <li key={m.id} className={`card flex flex-wrap gap-3 p-4 sm:flex-nowrap sm:items-center sm:gap-4 ${!m.claimed ? "border-accent" : ""}`}>
                <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[3px] border-black ${m.part ? "bg-[#d9e2c8]" : !m.claimed ? "bg-accent text-black" : "bg-black/50 text-muted"}`}>
                  {m.part ? <FragmentIcon type={m.part as FragmentType} size={34} /> : <Icon size={24} strokeWidth={2.2} />}
                  {!m.read && <span className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-[#ff5d4d]" />}
                </div>
                <div className="min-w-0 flex-1 basis-[calc(100%-60px)] sm:basis-auto">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="display break-words text-base leading-tight sm:text-lg">{m.title}</span>
                    <span className="text-xs text-muted" suppressHydrationWarning>
                      {ago(m.created_at)}
                    </span>
                  </div>
                  {m.body && <p className="mt-0.5 text-sm text-muted">{m.body}</p>}
                  {reward && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {m.points > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-black/60 px-2 py-0.5">
                          <Coin size={16} /> <b className="text-accent">+{m.points}</b>
                        </span>
                      )}
                      {m.crates > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-black/60 px-2 py-0.5">
                          <TbBox size={16} className="text-warn" /> <b className="text-warn">+{m.crates} crate{m.crates === 1 ? "" : "s"}</b>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {reward &&
                  (m.claimed ? (
                    <span className="flex shrink-0 items-center gap-1 self-center pl-[60px] text-xs font-bold text-muted sm:pl-0">
                      <TbCheck size={16} /> Claimed
                    </span>
                  ) : (
                    <button ref={(el) => void (btns.current[m.id] = el)} onClick={() => claim(m.id)} disabled={suspended || !!busy} className="btn btn-accent ml-[60px] w-[calc(100%-60px)] shrink-0 self-center !min-h-[42px] !px-4 text-sm sm:ml-0 sm:w-auto">
                      {busy === m.id ? "…" : "Claim"}
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
