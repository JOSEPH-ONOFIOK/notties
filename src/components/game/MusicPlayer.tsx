"use client";

import { useEffect, useSyncExternalStore } from "react";
import { TbMusic, TbMusicOff } from "react-icons/tb";
import { musicOn, setMusic, startMusic, stopMusic, subscribeMusic } from "@/lib/music";

/** Starts the background loop on the first tap anywhere (browsers block autoplay), pauses in background tabs. */
export function MusicPlayer() {
  useEffect(() => {
    const go = () => startMusic();
    const vis = () => (document.hidden ? stopMusic() : startMusic());
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      document.removeEventListener("visibilitychange", vis);
      stopMusic();
    };
  }, []);
  return null;
}

/** Music on/off, for the menu. */
export function MusicToggle({ className = "" }: { className?: string }) {
  const on = useSyncExternalStore(subscribeMusic, musicOn, () => true);
  return (
    <button onClick={() => setMusic(!on)} className={className} aria-label={on ? "Turn music off" : "Turn music on"}>
      <span className="flex items-center gap-2">
        {on ? <TbMusic size={16} /> : <TbMusicOff size={16} />} Music: {on ? "on" : "off"}
      </span>
    </button>
  );
}
