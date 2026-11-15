"use client";

import { useSyncExternalStore } from "react";
import { TbVolume, TbVolumeOff } from "react-icons/tb";
import { isMuted, setMuted, sfx, subscribeMuted } from "@/lib/sfx";

export function SoundToggle({ className = "" }: { className?: string }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  return (
    <button
      onClick={() => {
        setMuted(!muted);
        if (muted) setTimeout(() => sfx.pop(), 0);
      }}
      className={`grid h-10 w-10 place-items-center rounded-full border-[3px] border-black bg-raised shadow-[0_3px_0_#000] transition active:translate-y-[3px] active:shadow-none ${className}`}
      aria-label={muted ? "Turn sound on" : "Mute sound"}
      title={muted ? "Sound off" : "Sound on"}
    >
      {muted ? <TbVolumeOff size={18} strokeWidth={2.4} /> : <TbVolume size={18} strokeWidth={2.4} />}
    </button>
  );
}
