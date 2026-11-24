"use client";
/* eslint-disable react-hooks/immutability, react-hooks/purity -- an imperative canvas game loop: mutable refs and timers are the point */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaXTwitter } from "react-icons/fa6";
import { TbArrowBigDownFilled, TbArrowBigUpFilled, TbMaximize, TbMinimize, TbPlayerPauseFilled, TbPlayerPlayFilled } from "react-icons/tb";
import { api } from "@/lib/client";
import { sfx } from "@/lib/sfx";
import { Coin } from "./Coin";

/**
 * Lab Escape: an endless runner. Your Nottie runs through Vlad's lab; tap (or Space) to jump,
 * hold for a higher jump, tap again in the air to double jump. Dodge lasers, slime and drones,
 * grab goo. Speed builds smoothly toward a top speed, and obstacles are spaced by reaction time
 * so it stays fair. The browser runs the game; the server times each run and pays goo as $NOTTIES.
 */
// Logical width: narrower on phones so the play area is taller on screen. Set on mount.
let W = 760;
const H = 320;
const GROUND = 268;
const PX = 96; // player x
const PS = 64; // player hitbox size
const GRAVITY = 0.0026;
const JUMP = -0.9;
const START_SPEED = 0.3; // px per ms
const MAX_SPEED = 0.95;
const RAMP_MS = 70_000; // time constant: ~63% of the way to top speed after 70s
const REACTION_MS = 620; // minimum time between obstacles at any speed

type Ob = { x: number; y: number; w: number; h: number; kind: "laser" | "slime" | "drone" | "pipe" };
const SLIDE_MS = 650;
const PIPE_GAP = 34; // a hanging pipe leaves this much room above the floor: slide under it
type Goo = { x: number; y: number; got: boolean };
type Dust = { x: number; y: number; vx: number; vy: number; life: number };
type Result = { score: number; goo: number; reward: number; earnedToday: number; cap: number; best: number };

export function LabEscape({ layers, earnedToday, cap, best: bestToday, suspended, gooValue, shareReward, sharedToday, refCode }: { layers: string[]; earnedToday: number; cap: number; best: number; suspended: boolean; gooValue: number; shareReward: number; sharedToday: boolean; refCode: string }) {
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "running" | "over">("ready");
  const [hud, setHud] = useState({ score: 0, goo: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [earned, setEarned] = useState(earnedToday);
  const [best, setBest] = useState(bestToday);
  const imgs = useRef<HTMLImageElement[]>([]);
  const fresh = () => ({ y: GROUND - PS, vy: 0, jumps: 0, holding: false, speed: START_SPEED, dist: 0, goo: 0, obs: [] as Ob[], goos: [] as Goo[], dust: [] as Dust[], nextOb: 700, nextGoo: 420, t: 0, run: "", alive: false, shake: 0, wasAir: false, down: false, slideUntil: 0, paused: false, combo: 0, lastGoo: -9999, lastScore: 0, lastStep: 0 });
  const game = useRef(fresh());
  const raf = useRef(0);
  const [vw, setVw] = useState(760);
  const [full, setFullState] = useState(false);
  const fullRef = useRef(false);
  const setFull = (v: boolean) => {
    fullRef.current = v;
    setFullState(v);
  };
  const [paused, setPaused] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ y: number; slid: boolean } | null>(null);

  // Narrow phones in portrait get a narrower (so taller-looking) play area.
  useEffect(() => {
    const fit = () => {
      W = window.innerWidth < 640 && window.innerHeight > window.innerWidth ? 460 : 760;
      setVw(W);
    };
    const t = setTimeout(fit, 0);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fit);
    };
  }, []);

  // Leaving real fullscreen (Esc, back gesture) also leaves our full mode.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFull() {
    const el = wrap.current;
    if (!fullRef.current) {
      setFull(true);
      // Real fullscreen where the browser allows it; otherwise the full-window layout is enough.
      el?.requestFullscreen?.().catch(() => {});
    } else {
      setFull(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    setTimeout(() => draw(), 50);
  }

  function togglePause() {
    const g = game.current;
    if (!g.alive) return;
    g.paused = !g.paused;
    setPaused(g.paused);
    if (g.paused) draw();
  }

  function slide(on: boolean) {
    const g = game.current;
    g.down = on;
    if (on && g.alive) {
      const air = g.y < GROUND - PS - 0.5;
      if (air) g.vy = Math.max(g.vy, 0.95); // fast-fall, then slide on landing
      g.slideUntil = g.t + SLIDE_MS;
      if (!air) sfx.slide();
    }
  }

  useEffect(() => {
    imgs.current = layers.map((src) => {
      const i = new Image();
      i.src = src;
      return i;
    });
  }, [layers]);

  useEffect(() => {
    const t = setTimeout(() => draw(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw when the size changes
  }, [vw]);

  function press() {
    const g = game.current;
    if (!g.alive) return;
    g.holding = true;
    if (g.jumps < 2) {
      g.vy = g.jumps === 0 ? JUMP : JUMP * 0.82;
      g.jumps++;
      if (g.jumps === 1) sfx.jump();
      else sfx.doubleJump();
    }
  }
  function release() {
    const g = game.current;
    g.holding = false;
    // Let go early = short hop (cut the rise).
    if (g.vy < -0.35) g.vy *= 0.55;
  }

  async function start() {
    if (suspended) return;
    setErr(null);
    setResult(null);
    let run = "";
    try {
      const { result: r } = await api<{ result: { id: string } }>("/api/runner", { action: "start" });
      run = r.id;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start");
      return;
    }
    game.current = { ...fresh(), run, alive: true };
    setPaused(false);
    setHud({ score: 0, goo: 0 });
    setPhase("running");
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      if (!game.current.paused) {
        step(dt);
        draw();
      }
      if (game.current.alive) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  async function crash() {
    const g = game.current;
    g.alive = false;
    g.shake = 14;
    sfx.crash();
    for (let i = 0; i < 18; i++) g.dust.push({ x: PX + PS / 2, y: g.y + PS / 2, vx: (Math.random() - 0.5) * 0.6, vy: -Math.random() * 0.5, life: 600 });
    draw();
    setPhase("over");
    const score = Math.floor(g.dist / 12);
    try {
      const { result: r } = await api<{ result: Result }>("/api/runner", { action: "finish", id: g.run, score, goo: g.goo });
      setResult(r);
      setEarned(r.earnedToday);
      setBest(r.best);
      if (r.reward > 0) sfx.coin();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the run");
      setResult({ score, goo: g.goo, reward: 0, earnedToday: earned, cap, best });
    }
  }

  function step(dt: number) {
    const g = game.current;
    g.t += dt;
    // Smooth, realistic acceleration: fast at first, easing toward top speed.
    g.speed = MAX_SPEED - (MAX_SPEED - START_SPEED) * Math.exp(-g.t / RAMP_MS);
    const dx = g.speed * dt;
    g.dist += dx;
    // physics (holding makes gravity lighter on the way up = higher jump)
    const grav = g.holding && g.vy < 0 ? GRAVITY * 0.76 : GRAVITY;
    g.vy += grav * dt;
    g.y += g.vy * dt;
    // Ceiling: never leave the top of the lab.
    if (g.y < 8) {
      g.y = 8;
      if (g.vy < 0) g.vy = 0;
    }
    const air = g.y < GROUND - PS - 0.5;
    if (g.y >= GROUND - PS) {
      g.y = GROUND - PS;
      if (g.wasAir) sfx.land();
      if (g.wasAir) for (let i = 0; i < 6; i++) g.dust.push({ x: PX + 20 + Math.random() * 24, y: GROUND - 2, vx: -Math.random() * 0.25 - g.speed * 0.4, vy: -Math.random() * 0.18, life: 380 });
      g.vy = 0;
      g.jumps = 0;
    }
    g.wasAir = air;
    const sliding = !air && (g.down || g.t < g.slideUntil);
    // obstacles: spaced by reaction time so faster still means fair
    g.nextOb -= dx;
    if (g.nextOb <= 0) {
      const r = Math.random();
      const late = g.t > 25_000;
      if (r < 0.42) g.obs.push({ x: W + 20, y: GROUND - 26, w: 46, h: 26, kind: "slime" });
      else if (r < 0.82) {
        const h = 58 + Math.random() * (late ? 62 : 42);
        g.obs.push({ x: W + 20, y: GROUND - h, w: 14, h, kind: "laser" });
      } else if (r < 0.9 || g.t < 8_000) g.obs.push({ x: W + 20, y: GROUND - 118 - Math.random() * 26, w: 40, h: 22, kind: "drone" });
      // A pipe hanging from the ceiling: too tall to jump over, slide under it.
      else g.obs.push({ x: W + 20, y: 0, w: 34, h: GROUND - PIPE_GAP, kind: "pipe" });
      // Later on, sometimes a second slime right behind (needs a well-timed long jump).
      if (late && r < 0.42 && Math.random() < 0.3) g.obs.push({ x: W + 20 + 70, y: GROUND - 26, w: 46, h: 26, kind: "slime" });
      g.nextOb = g.speed * (REACTION_MS + Math.random() * 760) + 140;
    }
    g.nextGoo -= dx;
    if (g.nextGoo <= 0) {
      g.goos.push({ x: W + 20, y: GROUND - 40 - Math.random() * 120, got: false });
      g.nextGoo = 700 + Math.random() * 420;
    }
    for (const o of g.obs) o.x -= dx;
    for (const c of g.goos) c.x -= dx;
    for (const d of g.dust) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 0.0006 * dt;
      d.life -= dt;
    }
    g.obs = g.obs.filter((o) => o.x + o.w > -20);
    g.goos = g.goos.filter((c) => c.x > -20 && !c.got);
    g.dust = g.dust.filter((d) => d.life > 0);
    // collisions (slightly forgiving hitbox)
    const px = PX + 13;
    const py = sliding ? GROUND - 28 : g.y + 10;
    const pw = PS - 26;
    const ph = sliding ? 24 : PS - 14;
    for (const o of g.obs) {
      if (px < o.x + o.w && px + pw > o.x && py < o.y + o.h && py + ph > o.y) {
        void crash();
        return;
      }
    }
    for (const c of g.goos) {
      if (Math.hypot(c.x - (PX + PS / 2), c.y - (g.y + PS / 2)) < 34) {
        c.got = true;
        g.goo++;
        // Goo grabbed close together chimes higher and higher.
        g.combo = g.t - g.lastGoo < 2500 ? g.combo + 1 : 1;
        g.lastGoo = g.t;
        sfx.goo(g.combo);
      }
    }
    const sc = Math.floor(g.dist / 12);
    if (Math.floor(sc / 500) > Math.floor(g.lastScore / 500)) sfx.milestone(); // every 500 points
    g.lastScore = sc;
    // Footsteps on each stride while running.
    const stridePhase = Math.floor(g.t / (Math.PI * (62 - g.speed * 22)));
    if (!air && !sliding && stridePhase !== g.lastStep) sfx.step();
    g.lastStep = stridePhase;
    if (Math.floor(g.t / 100) !== Math.floor((g.t - dt) / 100)) setHud({ score: sc, goo: g.goo });
  }

  function draw() {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const g = game.current;
    // Draw at the screen's real resolution (CSS size × device pixel ratio) so it's sharp at any size.
    const k = Math.max(1, Math.min(3, ((c.clientWidth || W) * (window.devicePixelRatio || 1)) / W));
    const bw = Math.round(W * k);
    const bh = Math.round(H * k);
    if (c.width !== bw || c.height !== bh) {
      c.width = bw;
      c.height = bh;
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    if (g.shake > 0) {
      ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
      g.shake *= 0.85;
    }
    // lab wall
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1007");
    bg.addColorStop(1, "#1b2710");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    // far layer: lab tanks with bubbling goo (slow parallax)
    const far = (g.dist * 0.18) % 220;
    for (let x = -far - 40; x < W + 220; x += 220) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, 96, 70, GROUND - 96);
      ctx.fillStyle = "rgba(205,255,0,0.10)";
      ctx.fillRect(x + 8, 118, 54, GROUND - 130);
      ctx.fillStyle = "rgba(205,255,0,0.25)";
      const bub = (g.t / 14 + x) % 120;
      ctx.beginPath();
      ctx.arc(x + 35, GROUND - 20 - bub, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 120, 40, 46, 26);
    }
    // grid
    ctx.strokeStyle = "rgba(205,255,0,0.06)";
    ctx.lineWidth = 1;
    const off = (g.dist * 0.4) % 40;
    for (let x = -off; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GROUND);
      ctx.stroke();
    }
    // floor
    ctx.fillStyle = "#0a0d06";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#cdff00";
    ctx.fillRect(0, GROUND, W, 3);
    ctx.fillStyle = "rgba(205,255,0,0.22)";
    const so = g.dist % 60;
    for (let x = -so; x < W; x += 60) ctx.fillRect(x, GROUND + 14, 30, 4);
    // goo
    for (const gd of g.goos) {
      const bob = Math.sin((g.t + gd.x) / 200) * 3;
      ctx.beginPath();
      ctx.fillStyle = "#cdff00";
      ctx.shadowColor = "#cdff00";
      ctx.shadowBlur = 14;
      ctx.arc(gd.x, gd.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(gd.x - 3, gd.y + bob - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // obstacles
    for (const o of g.obs) {
      if (o.kind === "laser") {
        const flick = 0.75 + Math.sin(g.t / 40) * 0.25;
        ctx.fillStyle = `rgba(255,59,59,${flick})`;
        ctx.shadowColor = "#ff3b3b";
        ctx.shadowBlur = 18;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#2b2b2b";
        ctx.fillRect(o.x - 6, o.y - 8, o.w + 12, 10);
        ctx.fillRect(o.x - 6, GROUND - 4, o.w + 12, 4);
      } else if (o.kind === "pipe") {
        ctx.fillStyle = "#3a4150";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = "#596273";
        ctx.fillRect(o.x + 4, o.y, 6, o.h);
        ctx.fillStyle = "#2b2f38";
        for (let y = 40; y < o.h; y += 46) ctx.fillRect(o.x - 4, y, o.w + 8, 6);
        // dripping goo at the bottom edge + warning stripes
        ctx.fillStyle = "#ffb347";
        ctx.fillRect(o.x - 4, o.y + o.h - 10, o.w + 8, 10);
        ctx.fillStyle = "#000";
        for (let i = 0; i < 4; i++) ctx.fillRect(o.x - 4 + i * 11, o.y + o.h - 10, 5, 10);
        ctx.fillStyle = "#cdff00";
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y + o.h + 4 + ((g.t / 6) % 18), 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "slime") {
        const wob = Math.sin(g.t / 120 + o.x) * 2;
        ctx.fillStyle = "#6bd13a";
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, o.y + o.h, o.w / 2 + wob, o.h - wob / 2, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillRect(o.x + 12, o.y + 8, 5, 5);
        ctx.fillRect(o.x + 28, o.y + 8, 5, 5);
      } else {
        const hover = Math.sin(g.t / 160 + o.x) * 4;
        ctx.fillStyle = "#8a93a6";
        ctx.fillRect(o.x, o.y + hover, o.w, o.h);
        ctx.fillStyle = Math.floor(g.t / 250) % 2 ? "#ff3b3b" : "#ffb347";
        ctx.fillRect(o.x + o.w / 2 - 4, o.y + hover + 6, 8, 8);
        ctx.fillStyle = "#555";
        ctx.fillRect(o.x - 8, o.y + hover - 4, o.w + 16, 4);
      }
    }
    // shadow under the Nottie (smaller the higher it is)
    const hgt = GROUND - PS - g.y;
    const sh = Math.max(0.25, 1 - hgt / 220);
    ctx.fillStyle = `rgba(0,0,0,${0.45 * sh})`;
    ctx.beginPath();
    ctx.ellipse(PX + PS / 2, GROUND + 2, 26 * sh, 6 * sh, 0, 0, Math.PI * 2);
    ctx.fill();
    // dust
    for (const d of g.dust) {
      ctx.fillStyle = `rgba(205,255,0,${Math.max(0, d.life / 600) * 0.6})`;
      ctx.fillRect(d.x, d.y, 3, 3);
    }
    // the Nottie: running bob on the ground, lean when jumping
    const onGround = hgt < 0.5;
    const isSliding = onGround && g.alive && (g.down || g.t < g.slideUntil);
    const bobY = onGround && g.alive && !isSliding ? Math.abs(Math.sin(g.t / (90 - g.speed * 30))) * -4 : 0;
    const tilt = isSliding ? -0.35 : !onGround ? (g.vy < 0 ? -0.14 : 0.12) : Math.sin(g.t / 70) * 0.05;
    ctx.save();
    ctx.translate(PX + PS / 2, g.y + PS / 2 + bobY + (isSliding ? 18 : 0));
    ctx.rotate(tilt);
    if (isSliding) {
      ctx.scale(1.12, 0.6);
      if (Math.random() < 0.6) g.dust.push({ x: PX + 6, y: GROUND - 3, vx: -0.2 - g.speed * 0.3, vy: -Math.random() * 0.1, life: 260 });
    }
    const ready = imgs.current.length && imgs.current.every((i) => i.complete && i.naturalWidth);
    if (ready) {
      // Bigger sprite; anchored so the feet (about 85% down the art) sit on the ground line.
      const S = fullRef.current ? 140 : 172;
      const dx = -S / 2;
      const dy = PS / 2 + 4 - S * 0.85;
      // Stride: -1..1. Feet alternate on the ground, tuck in the air, stay flat while sliding.
      const running = onGround && g.alive && !isSliding;
      const stride = running ? Math.sin(g.t / (62 - g.speed * 22)) : 0;
      const sq = running ? 1 + Math.abs(stride) * 0.045 : !onGround ? 0.96 : 1; // squash on each footfall, stretch in the air
      ctx.scale(sq, 1 / sq); // wider + shorter on a footfall, taller + thinner in the air
      if (running) ctx.rotate(-0.06); // lean into the run
      for (let n = 0; n < imgs.current.length; n++) {
        const i = imgs.current[n];
        if (!/\/traits\/shoes\//.test(layers[n] ?? "")) {
          ctx.drawImage(i, dx, dy, S, S);
          continue;
        }
        const iw = i.naturalWidth;
        const ih = i.naturalHeight;
        const lift = 7;
        const offL = running ? -Math.max(0, stride) * lift : !onGround ? -5 : 0;
        const offR = running ? -Math.max(0, -stride) * lift : !onGround ? -3 : 0;
        ctx.drawImage(i, 0, 0, iw / 2, ih, dx, dy + offL, S / 2, S);
        ctx.drawImage(i, iw / 2, 0, iw / 2, ih, dx + S / 2, dy + offR, S / 2, S);
      }
    }
    else {
      ctx.fillStyle = "#cdff00";
      ctx.beginPath();
      ctx.ellipse(0, 0, PS / 2.6, PS / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // speed lines at high speed
    if (g.speed > 0.7 && g.alive) {
      ctx.strokeStyle = `rgba(255,255,255,${(g.speed - 0.7) * 0.5})`;
      for (let i = 0; i < 6; i++) {
        const y = 40 + ((i * 47 + g.t / 3) % (GROUND - 60));
        const x = W - ((g.t * 1.4 + i * 130) % (W + 80));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 40, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  useEffect(() => {
    const JUMP_KEYS = ["Space", "ArrowUp", "KeyW"];
    const SLIDE_KEYS = ["ArrowDown", "KeyS"];
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      const g = game.current;
      if (JUMP_KEYS.includes(e.code) || SLIDE_KEYS.includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (JUMP_KEYS.includes(e.code) && g.alive && !g.paused) press();
      else if (SLIDE_KEYS.includes(e.code) && g.alive && !g.paused) slide(true);
      else if (e.code === "KeyP" || (e.code === "Escape" && g.alive)) togglePause();
      else if (e.code === "KeyF") toggleFull();
      else if ((e.code === "Enter" || e.code === "KeyR") && !g.alive) document.getElementById("lab-escape-start")?.click();
    };
    const up = (e: KeyboardEvent) => {
      if (JUMP_KEYS.includes(e.code)) release();
      if (SLIDE_KEYS.includes(e.code)) slide(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    // Handlers read live state from refs, so they're bound once.
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read live state from refs
  }, []);

  const capped = earned >= cap;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div ref={wrap} className={full ? "fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black" : "card overflow-hidden p-0"}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-black bg-black/40 px-3 py-2">
          <div className="display flex items-center gap-4 text-sm">
            <span>
              Score <b className="tabular-nums text-accent">{hud.score}</b>
            </span>
            <span>
              Goo <b className="tabular-nums text-accent">{hud.goo}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
              <Coin size={14} /> {earned.toLocaleString()}/{cap.toLocaleString()}
            </span>
            {phase === "running" && (
              <button onClick={togglePause} className="grid h-9 w-9 place-items-center rounded-full border-2 border-black bg-raised" aria-label={paused ? "Resume" : "Pause"} title="Pause (P)">
                {paused ? <TbPlayerPlayFilled size={16} /> : <TbPlayerPauseFilled size={16} />}
              </button>
            )}
            <button onClick={toggleFull} className="grid h-9 w-9 place-items-center rounded-full border-2 border-black bg-raised" aria-label={full ? "Exit fullscreen" : "Fullscreen"} title="Fullscreen (F)">
              {full ? <TbMinimize size={16} /> : <TbMaximize size={16} />}
            </button>
          </div>
        </div>
        <div className={full ? "relative flex min-h-0 flex-1 items-center justify-center" : "relative"}>
          <canvas
            ref={canvas}
            onPointerDown={(e) => {
              e.preventDefault();
              swipe.current = { y: e.clientY, slid: false };
              if (phase === "running") press();
            }}
            onPointerMove={(e) => {
              // Swipe down on the game = slide.
              const sw = swipe.current;
              if (sw && !sw.slid && e.clientY - sw.y > 28 && phase === "running") {
                sw.slid = true;
                release();
                slide(true);
                setTimeout(() => slide(false), 60);
              }
            }}
            onPointerUp={() => {
              swipe.current = null;
              release();
            }}
            onPointerLeave={() => release()}
            className={`block touch-none select-none ${full ? "max-h-full max-w-full" : "h-auto w-full"}`}
            style={full ? { aspectRatio: `${vw} / ${H}`, width: `min(100vw, calc((100dvh - 150px) * ${vw} / ${H}))` } : { aspectRatio: `${vw} / ${H}` }}
          />
          {phase === "running" && paused && (
            <button onClick={togglePause} className="absolute inset-0 grid place-items-center bg-black/55">
              <span className="display text-3xl text-white">Paused · tap to resume</span>
            </button>
          )}
          {phase !== "running" && (
            <div className="absolute inset-0 grid place-items-center bg-black/55 p-4 text-center">
              <div>
                {phase === "over" && result ? (
                  <>
                    <div className="display text-3xl text-white sm:text-4xl">Caught!</div>
                    <div className="mt-1 text-sm text-white/80">
                      Score <b className="text-accent">{result.score}</b> · Goo <b className="text-accent">{result.goo}</b>
                    </div>
                    <div className="display mt-2 inline-flex items-center gap-1 rounded-full border-2 border-black bg-accent px-3 py-1 text-black">
                      <Coin size={16} /> +{result.reward.toLocaleString()} $NOTTIES
                    </div>
                    {result.reward === 0 && result.goo > 0 && <div className="mt-1 text-xs text-white/70">You hit today&apos;s {result.cap.toLocaleString()} $NOTTIES limit. Play for the high score!</div>}
                  </>
                ) : phase === "over" ? (
                  <div className="display text-2xl text-white">Saving…</div>
                ) : (
                  <>
                    <div className="display text-3xl text-white sm:text-4xl">Lab Escape</div>
                    <p className="mt-1 max-w-sm text-sm text-white/80">Jump over lasers and slime, slide under hanging pipes, grab goo. Each goo is {gooValue} $NOTTIES.</p>
                  </>
                )}
                <button id="lab-escape-start" onClick={start} disabled={suspended || (phase === "over" && !result)} className="btn btn-accent mt-4">
                  {phase === "over" ? "Run again" : "Start run"}
                </button>
                {capped && phase === "ready" && <div className="mt-2 text-xs text-white/70">Daily $NOTTIES limit reached. You can still play for the leaderboard.</div>}
                {err && <div className="mt-2 text-sm font-bold text-error">{err}</div>}
              </div>
            </div>
          )}
        </div>
        {/* Touch controls: big buttons (also work with a mouse). */}
        <div className={`grid grid-cols-2 gap-2 border-t-[3px] border-black bg-black/40 p-2 ${full ? "" : "lg:hidden"}`}>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (phase === "running") press();
            }}
            onPointerUp={() => release()}
            onPointerLeave={() => release()}
            className="display flex touch-none select-none items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-accent py-4 text-lg text-black shadow-[0_4px_0_#000] active:translate-y-1 active:shadow-none"
          >
            <TbArrowBigUpFilled size={22} /> Jump
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (phase === "running") slide(true);
            }}
            onPointerUp={() => slide(false)}
            onPointerLeave={() => slide(false)}
            className="display flex touch-none select-none items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-warn py-4 text-lg text-black shadow-[0_4px_0_#000] active:translate-y-1 active:shadow-none"
          >
            <TbArrowBigDownFilled size={22} /> Slide
          </button>
        </div>
        {/* Keyboard help on computers. */}
        <div className={`flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t-[3px] border-black bg-black/40 px-3 py-2 text-xs text-muted ${full ? "hidden lg:flex" : "hidden lg:flex"}`}>
          {[
            ["Space / W / ↑", "jump (hold = higher, again = double)"],
            ["S / ↓", "slide"],
            ["P / Esc", "pause"],
            ["F", "fullscreen"],
            ["Enter / R", "start"],
          ].map(([k, v]) => (
            <span key={k}>
              <kbd className="rounded border border-border bg-raised px-1.5 py-0.5 font-mono text-[11px] text-text">{k}</kbd> {v}
            </span>
          ))}
        </div>
      </div>
      <ShareScore best={best} reward={shareReward} shared={sharedToday} refCode={refCode} />
    </div>
  );
}

/** Post today's best score on X once a day for a $NOTTIES bonus. */
function ShareScore({ best, reward, shared, refCode }: { best: number; reward: number; shared: boolean; refCode: string }) {
  const router = useRouter();
  const [opened, setOpened] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(shared);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const site = typeof window !== "undefined" ? window.location.origin : "https://nottiesraid.fun";
  const text = `I scored ${best.toLocaleString()} in Lab Escape today 🏃‍♂️💨 Running from Vlad's lab and stacking $NOTTIES with @thenottiesworld. Beat me 👇`;
  const href = `https://x.com/intent/post?${new URLSearchParams({ text, url: `${site}/?ref=${encodeURIComponent(refCode)}` })}`;

  async function post() {
    sfx.click();
    window.open(href, "_blank", "noopener");
    setOpened(Date.now());
    await api("/api/runner", { action: "share_click" }).catch(() => {});
  }
  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      const { result } = await api<{ result: { reward: number } }>("/api/runner", { action: "share_claim" });
      sfx.coin();
      setDone(true);
      setMsg({ ok: true, text: `+${result.reward.toLocaleString()} $NOTTIES added to your balance.` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't claim" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-black text-white">
        <FaXTwitter size={20} />
      </span>
      <div className="min-w-0 flex-1 basis-[calc(100%-60px)] sm:basis-auto">
        <div className="display text-lg leading-tight">Post today&apos;s score: +{reward.toLocaleString()} $NOTTIES</div>
        <div className="text-xs text-muted">{done ? "Done for today. Come back tomorrow!" : best > 0 ? `Share your best run today (${best.toLocaleString()}) on X, then claim. Once a day.` : "Play a run first, then share your score."}</div>
        {msg && <div className={`mt-1 text-sm font-bold ${msg.ok ? "text-accent" : "text-error"}`}>{msg.text}</div>}
      </div>
      {!done && (
        <div className="flex w-full gap-2 sm:w-auto">
          <button onClick={post} disabled={best <= 0} className="btn btn-ghost !min-h-[40px] flex-1 text-sm sm:flex-none">
            <FaXTwitter size={15} /> Post
          </button>
          <button onClick={claim} disabled={!opened || busy} className="btn btn-accent !min-h-[40px] flex-1 text-sm sm:flex-none" title={!opened ? "Post first" : undefined}>
            {busy ? "…" : "Claim"}
          </button>
        </div>
      )}
    </div>
  );
}
