"use client";

import { useEffect, useState } from "react";
import { fmtDuration, timeLeft , serverNow} from "@/lib/client";
import { useMounted } from "./useMounted";

export function Countdown({ until, readyText, className = "", plain = false }: { until: string | null; readyText: string; className?: string; plain?: boolean }) {
  const mounted = useMounted();
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = timeLeft(until, now);
  return (
    <div className={className} aria-live="polite">
      {!mounted ? <span className="text-muted">…</span> : left === 0 ? <span className={plain ? "" : "goo-text"}>{readyText}</span> : <span className="tabular-nums">{fmtDuration(left)}</span>}
    </div>
  );
}
