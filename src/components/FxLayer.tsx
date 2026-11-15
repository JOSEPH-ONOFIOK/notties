"use client";

import { useEffect, useRef, useState } from "react";
import { onFx } from "@/lib/fx";

type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; life: number };
type F = { id: number; x: number; y: number; text: string; color?: string };

const DEFAULT = ["#cdff00", "#f4f7eb", "#8ad7ff", "#d79cff", "#ffb347"];

/** Global overlay: canvas confetti, floating "+N" text and screen shake. Mounted once in the game layout. */
export function FxLayer({ children }: { children: React.ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef<number | null>(null);
  const [floats, setFloats] = useState<F[]>([]);
  const shakeEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const resize = () => {
      cv.width = window.innerWidth * devicePixelRatio;
      cv.height = window.innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const ps = parts.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += 0.32;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life -= 1;
        if (p.life <= 0 || p.y > window.innerHeight + 40) {
          ps.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.fillStyle = p.c;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1.5;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf.current = ps.length ? requestAnimationFrame(tick) : null;
    };

    let fid = 0;
    const off = onFx((e) => {
      if (e.kind === "burst") {
        if (reduce) return;
        const { x, y, colors = DEFAULT, count = 80, spread = Math.PI * 2, power = 13 } = e.data;
        for (let i = 0; i < count; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
          const s = power * (0.4 + Math.random() * 0.8);
          parts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, c: colors[i % colors.length], life: 90 + Math.random() * 60 });
        }
        if (raf.current == null) raf.current = requestAnimationFrame(tick);
      } else if (e.kind === "float") {
        const id = ++fid;
        setFloats((f) => [...f, { id, ...e.data }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
      } else if (e.kind === "shake" && !reduce && shakeEl.current) {
        // Restart the CSS animation without remounting children (keeps their state).
        const el = shakeEl.current;
        el.classList.remove("anim-screen-shake");
        void el.offsetWidth;
        el.classList.add("anim-screen-shake");
      }
    });
    return () => {
      off();
      window.removeEventListener("resize", resize);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div ref={shakeEl} onAnimationEnd={(e) => e.currentTarget === e.target && e.currentTarget.classList.remove("anim-screen-shake")}>
        {children}
      </div>
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[90] h-full w-full" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-[91]" aria-hidden>
        {floats.map((f) => (
          <div key={f.id} className="display ink-text absolute whitespace-nowrap text-3xl" style={{ left: f.x, top: f.y, color: f.color ?? "#cdff00", animation: "float-up 1.25s ease-out forwards" }}>
            {f.text}
          </div>
        ))}
      </div>
    </>
  );
}
