"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { TbBell, TbBellOff, TbPlayerPlayFilled, TbVolume, TbVolumeOff, TbDeviceMobileVibration } from "react-icons/tb";
import { isMuted, setMuted, sfx, subscribeMuted } from "@/lib/sfx";
import { replayIntro } from "./game/IntroStory";

const subscribeNone = () => () => {};
const readNotify = () => {
  try {
    return localStorage.getItem("nt_notify") === "1" && typeof Notification !== "undefined" && Notification.permission === "granted";
  } catch {
    return false;
  }
};

export function SettingsPanel() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const initialNotify = useSyncExternalStore(subscribeNone, readNotify, () => false);
  const [notify, setNotify] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const on = notify ?? initialNotify;

  async function toggleNotify() {
    if (on) {
      try {
        localStorage.setItem("nt_notify", "0");
      } catch {}
      setNotify(false);
      return;
    }
    if (typeof Notification === "undefined") {
      setNote("This browser doesn't support notifications.");
      return;
    }
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") {
      setNote("Notifications are blocked for this site in your browser settings.");
      return;
    }
    try {
      localStorage.setItem("nt_notify", "1");
    } catch {}
    setNotify(true);
    setNote("You'll get a ping when your crate is ready (while a Notties tab is open).");
    sfx.pop();
  }

  const row = "flex items-center gap-4 rounded-2xl border-[3px] border-black bg-raised p-4 shadow-[0_4px_0_#000]";
  return (
    <div className="space-y-3">
      <div className={row}>
        {on ? <TbBell size={24} className="text-accent" /> : <TbBellOff size={24} className="text-muted" />}
        <div className="flex-1">
          <div className="display">Crate-ready alerts</div>
          <div className="text-xs text-muted">A browser notification when your next crate washes up.</div>
          {note && <div className="mt-1 text-xs text-accent">{note}</div>}
        </div>
        <Switch on={on} onClick={toggleNotify} label="Crate-ready alerts" />
      </div>
      <div className={row}>
        {muted ? <TbVolumeOff size={24} className="text-muted" /> : <TbVolume size={24} className="text-accent" />}
        <div className="flex-1">
          <div className="display">Sound effects</div>
          <div className="text-xs text-muted">Crate cracks, coins and fanfares.</div>
        </div>
        <Switch
          on={!muted}
          onClick={() => {
            setMuted(!muted);
            if (muted) setTimeout(() => sfx.pop(), 0);
          }}
          label="Sound effects"
        />
      </div>
      <div className={row}>
        <TbDeviceMobileVibration size={24} className="text-accent" />
        <div className="flex-1">
          <div className="display">Vibration</div>
          <div className="text-xs text-muted">Phones buzz when you crack a crate. Turn it off in your phone settings if it bugs you.</div>
        </div>
      </div>
      <div className={row}>
        <TbPlayerPlayFilled size={22} className="text-accent" />
        <div className="flex-1">
          <div className="display">Intro story</div>
          <div className="text-xs text-muted">Watch Vlad&apos;s five-panel intro again.</div>
        </div>
        <button onClick={() => replayIntro()} className="btn btn-ghost !min-h-[40px] !px-4 text-sm">
          Replay
        </button>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 text-sm">
        <Link href="/wallet" className="btn btn-ghost !min-h-[40px] text-sm">
          Getaway wallet
        </Link>
        <Link href="/wiki" className="btn btn-ghost !min-h-[40px] text-sm">
          Field guide
        </Link>
      </div>
    </div>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-8 w-14 shrink-0 rounded-full border-[3px] border-black transition ${on ? "bg-accent" : "bg-black/50"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-black bg-white transition-all ${on ? "left-7" : "left-0.5"}`} />
    </button>
  );
}
