"use client";

import { useEffect, useRef, useState } from "react";

/** Animates a number from its previous value to the new one (slot-machine style ticking). */
export function CountUp({ value, duration = 900, className = "" }: { value: number; duration?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - (1 - k) ** 3;
      setShown(Math.round(start + (value - start) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        from.current = value;
        setBump(false);
      }
    };
    raf = requestAnimationFrame((t) => {
      setBump(value > start);
      step(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={`inline-block tabular-nums transition-transform ${bump ? "scale-125 text-accent" : ""} ${className}`} style={{ transitionDuration: "200ms" }}>
      {shown.toLocaleString()}
    </span>
  );
}
