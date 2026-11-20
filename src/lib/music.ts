"use client";

import { isMuted, subscribeMuted } from "./sfx";

/**
 * Background music: an original, bouncy cartoon loop (oom-pah tuba bass, ukulele plucks and a
 * kazoo-ish lead), synthesized live with Web Audio. No audio files, nothing to host, no
 * licensing. It starts on the first tap (browsers block autoplay), stays quiet, and stops when
 * sound is muted or the player turns music off. Preference is saved per browser.
 */
const KEY = "nt_music";
const BPM = 124;
const EIGHTH = 60 / BPM / 2;
const BARS = 8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextStep = 0;
let nextTime = 0;
let on = true;
const listeners = new Set<() => void>();

try {
  if (typeof window !== "undefined") on = localStorage.getItem(KEY) !== "0";
} catch {}

export const musicOn = () => on;
export function subscribeMusic(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function setMusic(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
  if (v) startMusic();
  else stopMusic();
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
// C major-ish progression, two bars each pass: C  F  G  C | Am F  G  C
const CHORDS = [
  [48, 52, 55],
  [53, 57, 60],
  [55, 59, 62],
  [48, 52, 55],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
  [48, 52, 55],
];
// Lead melody, 8 eighth-notes per bar (0 = rest).
const LEAD = [
  [76, 79, 76, 72, 74, 0, 67, 0],
  [77, 81, 77, 74, 76, 0, 72, 0],
  [74, 76, 77, 79, 81, 79, 77, 74],
  [76, 74, 72, 67, 72, 0, 0, 0],
  [72, 76, 79, 76, 81, 0, 79, 0],
  [77, 76, 74, 72, 74, 0, 77, 0],
  [79, 0, 77, 76, 74, 76, 77, 79],
  [84, 0, 79, 0, 72, 0, 0, 0],
];

function note(type: OscillatorType, freq: number, t: number, len: number, vol: number, opts: { vibrato?: boolean; lowpass?: number } = {}) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  let out: AudioNode = g;
  if (opts.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.lowpass;
    g.connect(f);
    out = f;
  }
  if (opts.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.value = freq * 0.012;
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + len + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g);
  out.connect(master);
  o.start(t);
  o.stop(t + len + 0.05);
}

function schedule(step: number, t: number) {
  const bar = Math.floor(step / 8) % BARS;
  const beat = step % 8;
  const chord = CHORDS[bar];
  // Oom-pah: root on the beat, fifth on the "and" of beats 2 and 4.
  if (beat === 0 || beat === 4) note("square", hz(chord[0] - 12), t, EIGHTH * 0.9, 0.09, { lowpass: 420 });
  if (beat === 2 || beat === 6) note("square", hz(chord[2] - 12), t, EIGHTH * 0.8, 0.07, { lowpass: 420 });
  // Ukulele strum on the off-beats.
  if (beat % 2 === 1) chord.forEach((m, i) => note("triangle", hz(m + 12), t + i * 0.012, EIGHTH * 0.7, 0.05));
  // Kazoo lead.
  const m = LEAD[bar][beat];
  if (m) note("sawtooth", hz(m), t, EIGHTH * 0.92, 0.035, { vibrato: true, lowpass: 1800 });
}

export function startMusic() {
  if (!on || isMuted() || typeof window === "undefined" || timer) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    if (!master) {
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.3);
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(() => {
      if (!ctx) return;
      while (nextTime < ctx.currentTime + 0.25) {
        schedule(nextStep, nextTime);
        nextStep = (nextStep + 1) % (BARS * 8);
        nextTime += EIGHTH;
      }
    }, 60);
  } catch {}
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (ctx && master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
}

// Muting all sound stops the music too; unmuting brings it back (if music is on).
if (typeof window !== "undefined") subscribeMuted(() => (isMuted() ? stopMusic() : startMusic()));
