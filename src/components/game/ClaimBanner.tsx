"use client";

import { useEffect, useState } from "react";
import { TbClock } from "react-icons/tb";
import { fmtDuration, serverNow, timeLeft } from "@/lib/client";
import { useMounted } from "../useMounted";

/** Countdown strip ("Claim ends in 21:59:59"). Display only; hides itself at zero. */
export function ClaimBanner({ until, label }: { until: string; label: string }) {
  const mounted = useMounted();
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!until || Number.isNaN(Date.parse(until))) return null;
  const left = timeLeft(until, now);
  if (mounted && left === 0) return null;
  return (
    <div className="border-b-[3px] border-black bg-accent text-black">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-3 py-1.5 text-center">
        <TbClock size={16} strokeWidth={2.6} className="shrink-0" />
        <span className="display text-xs tracking-widest sm:text-sm">{label}</span>
        <span className="display text-sm tabular-nums sm:text-base" suppressHydrationWarning>
          {mounted ? fmtDuration(left) : "…"}
        </span>
      </div>
    </div>
  );
}
