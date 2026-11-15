"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The living backdrop behind every page:
 *  - canvas of glowing goo spores that rise, wobble, flicker and shy away from the pointer
 *  - two fog bands that roll slowly and lean with the mouse (parallax)
 *  - an occasional portal pulse rippling out from a random spot
 *  - a Nottie that sometimes peeks in from a screen edge
 * Pauses when the tab is hidden; goes static for prefers-reduced-motion.
 */

type Spore = {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  amp: number;
  tw: number;
  hue: number;
  vx: number;
};
type Pulse = { x: number; y: number; t: number };
type Peek = { id: number; side: "bottom" | "left" | "right"; pos: number };

export function LiveBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState<Peek | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0;
    let H = 0;
    let spores: Spore[] = [];
    const pulses: Pulse[] = [];
    const mouse = { x: -9999, y: -9999, tx: 0, ty: 0, px: 0, py: 0 };

    const make = (fromBottom = false): Spore => {
      const r =
        Math.random() < 0.15 ? 3 + Math.random() * 3 : 1.2 + Math.random() * 2;
      return {
        x: Math.random() * W,
        y: fromBottom ? H + 10 + Math.random() * 40 : Math.random() * H,
        r,
        vy: 0.12 + Math.random() * 0.35 + r * 0.04,
        vx: 0,
        phase: Math.random() * Math.PI * 2,
        amp: 0.2 + Math.random() * 0.6,
        tw: 0.5 + Math.random() * 2,
        hue: Math.random() < 0.85 ? 72 : 160, // mostly lime, a few teal
      };
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(130, (W * H) / 12000));
      while (spores.length < target) spores.push(make());
      spores = spores.slice(0, target);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.tx = (e.clientX / W - 0.5) * 2;
      mouse.ty = (e.clientY / H - 0.5) * 2;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let nextPulse = 4000 + Math.random() * 6000;

    const draw = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      t += dt;
      const k = dt / 16.67;
      ctx.clearRect(0, 0, W, H);

      // portal pulses
      nextPulse -= dt;
      if (nextPulse <= 0) {
        pulses.push({
          x: W * (0.15 + Math.random() * 0.7),
          y: H * (0.2 + Math.random() * 0.7),
          t: 0,
        });
        nextPulse = 7000 + Math.random() * 7000;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += dt;
        const life = p.t / 2600;
        if (life >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const rad = 40 + life * Math.max(W, H) * 0.45;
        const a = (1 - life) ** 2;
        const g = ctx.createRadialGradient(p.x, p.y, rad * 0.7, p.x, p.y, rad);
        g.addColorStop(0, "rgba(205,255,0,0)");
        g.addColorStop(0.85, `rgba(205,255,0,${0.12 * a})`);
        g.addColorStop(1, "rgba(205,255,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        // spores near the wavefront get a nudge
        for (const s of spores) {
          const d = Math.hypot(s.x - p.x, s.y - p.y);
          if (Math.abs(d - rad) < 30 && d > 0) {
            s.vx += ((s.x - p.x) / d) * 0.25 * a;
          }
        }
      }

      // spores
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < spores.length; i++) {
        const s = spores[i];
        s.phase += 0.01 * k;
        s.y -= s.vy * k;
        s.x += (Math.sin(s.phase * 1.3) * s.amp + s.vx) * k;
        s.vx *= 0.96;

        const dx = s.x - mouse.x;
        const dy = s.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 120 * 120) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 120) * 1.6;
          s.vx += (dx / d) * f * 0.35;
          s.y += (dy / d) * f * 0.6;
        }

        if (s.y < -20 || s.x < -30 || s.x > W + 30) spores[i] = make(true);

        const flicker = 0.55 + 0.45 * Math.sin(t * 0.001 * s.tw + s.phase * 3);
        const alpha = Math.min(1, (H - s.y) / 120) * flicker; // fade in from the bottom
        const glow = s.r * 6;
        const col = s.hue === 72 ? "205,255,0" : "120,255,210";
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glow);
        g.addColorStop(0, `rgba(${col},${0.8 * alpha})`);
        g.addColorStop(0.3, `rgba(${col},${0.28 * alpha})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(240,255,200,${0.9 * alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // parallax for the fog layers (eased)
      mouse.px += (mouse.tx - mouse.px) * 0.04 * k;
      mouse.py += (mouse.ty - mouse.py) * 0.04 * k;
      root.current?.style.setProperty("--mx", mouse.px.toFixed(3));
      root.current?.style.setProperty("--my", mouse.py.toFixed(3));

      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!raf && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    if (reduce) {
      // one still frame of spores
      for (const s of spores) {
        ctx.fillStyle = "rgba(205,255,0,.35)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else start();

    // peeking Nottie
    let peekTimer: ReturnType<typeof setTimeout>;
    let id = 0;
    const schedule = () => {
      peekTimer = setTimeout(
        () => {
          if (!document.hidden) {
            const sides = ["bottom", "left", "right"] as const;
            setPeek({
              id: ++id,
              side: sides[Math.floor(Math.random() * 3)],
              pos: 12 + Math.random() * 70,
            });
          }
          schedule();
        },
        16000 + Math.random() * 20000,
      );
    };
    if (!reduce) {
      peekTimer = setTimeout(() => {
        setPeek({ id: ++id, side: "bottom", pos: 78 });
        schedule();
      }, 6000);
    }

    return () => {
      stop();
      clearTimeout(peekTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <>
      <div
        ref={root}
        aria-hidden
        className="live-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="live-grid" />
        <div className="live-fog live-fog-a" />
        <div className="live-fog live-fog-b" />
        <canvas ref={canvas} className="absolute inset-0" />
        <div className="live-vignette" />
      </div>
      {/* the peeker sits above page content (still click-through), below the nav and overlays */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      >
        {peek && (
          <Peeker key={peek.id} {...peek} onDone={() => setPeek(null)} />
        )}
      </div>
    </>
  );
}

function Peeker({ side, pos, onDone }: Peek & { onDone: () => void }) {
  const style: React.CSSProperties =
    side === "bottom"
      ? { left: `${pos}%`, bottom: 0 }
      : side === "left"
        ? { left: 0, top: `${pos}%` }
        : { right: 0, top: `${pos}%` };
  return (
    <div className={`peek peek-${side}`} style={style} onAnimationEnd={onDone}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo.png"
        alt=""
        width={72}
        height={74}
        className="peek-img"
      />
    </div>
  );
}
