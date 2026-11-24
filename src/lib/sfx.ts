"use client";

/**
 * Tiny synthesized sound effects (Web Audio, no files). Muted state persists per browser.
 * Every call is a no-op on the server, before the first user gesture, or when muted.
 */

const KEY = "nt_muted";
let ctx: AudioContext | null = null;
let muted = false;
const listeners = new Set<() => void>();

try {
  if (typeof window !== "undefined") muted = localStorage.getItem(KEY) === "1";
} catch {}

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}
export function subscribeMuted(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function ac() {
  if (muted || typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + (opts.delay ?? 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? "square";
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t + dur);
  g.gain.setValueAtTime(opts.vol ?? 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15, delay = 0, hp = 800) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  click: () => tone(520, 0.05, { type: "square", vol: 0.04 }),
  hover: () => tone(880, 0.03, { type: "sine", vol: 0.02 }),
  pop: () => tone(300, 0.12, { type: "sine", vol: 0.12, slide: 3 }),
  crack: (n = 1) => {
    noise(0.12, 0.25, 0, 1200);
    tone(140 + n * 40, 0.1, { type: "triangle", vol: 0.12, slide: 0.5 });
  },
  whoosh: () => noise(0.35, 0.12, 0, 400),
  coin: () => {
    tone(988, 0.08, { type: "square", vol: 0.05 });
    tone(1319, 0.22, { type: "square", vol: 0.05, delay: 0.08 });
  },
  error: () => {
    tone(160, 0.12, { type: "sawtooth", vol: 0.06 });
    tone(120, 0.18, { type: "sawtooth", vol: 0.06, delay: 0.1 });
  },
  zap: () => {
    noise(0.08, 0.18, 0, 2500);
    tone(1800, 0.1, { type: "sawtooth", vol: 0.04, slide: 0.2 });
  },
  reveal: (tier: number) => {
    // tier 0 common … 4 legendary: longer, higher arpeggio for rarer drops
    const notes = [523, 659, 784, 1047, 1319, 1568];
    const n = 2 + tier;
    for (let i = 0; i < n; i++) tone(notes[i % notes.length] * (i >= notes.length ? 2 : 1), 0.14 + (i === n - 1 ? 0.3 : 0), { type: "square", vol: 0.05, delay: i * 0.08 });
    if (tier >= 3) noise(0.6, 0.08, n * 0.08, 3000);
  },
  levelUp: () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: "square", vol: 0.05, delay: i * 0.09 }));
  },
  stamp: () => {
    noise(0.15, 0.3, 0, 200);
    tone(90, 0.2, { type: "sine", vol: 0.2, slide: 0.5 });
  },
  // ── Lab Escape ──
  jump: () => tone(330, 0.16, { type: "square", vol: 0.05, slide: 2.2 }),
  doubleJump: () => {
    tone(520, 0.12, { type: "square", vol: 0.05, slide: 2 });
    tone(780, 0.1, { type: "sine", vol: 0.04, slide: 1.5, delay: 0.05 });
  },
  slide: () => {
    noise(0.28, 0.1, 0, 300);
    tone(220, 0.22, { type: "triangle", vol: 0.05, slide: 0.6 });
  },
  land: () => {
    noise(0.06, 0.12, 0, 150);
    tone(110, 0.08, { type: "sine", vol: 0.08, slide: 0.7 });
  },
  step: () => tone(180 + Math.random() * 40, 0.03, { type: "triangle", vol: 0.018 }),
  goo: (combo = 1) => {
    const f = 660 * Math.pow(1.06, Math.min(combo - 1, 12)); // climbs with a streak of goo
    tone(f, 0.08, { type: "sine", vol: 0.07 });
    tone(f * 1.5, 0.14, { type: "sine", vol: 0.05, delay: 0.05 });
  },
  crash: () => {
    noise(0.35, 0.3, 0, 120);
    tone(300, 0.5, { type: "sawtooth", vol: 0.06, slide: 0.2 });
    tone(90, 0.35, { type: "sine", vol: 0.14, slide: 0.5, delay: 0.05 });
  },
  milestone: () => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, { type: "square", vol: 0.045, delay: i * 0.06 }));
  },
};
