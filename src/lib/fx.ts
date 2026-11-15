"use client";

/** A tiny event bus so any component can fire confetti / floating numbers into the global FxLayer. */

export type Burst = { x: number; y: number; colors?: string[]; count?: number; spread?: number; power?: number };
export type Float = { x: number; y: number; text: string; color?: string };
type Event = { kind: "burst"; data: Burst } | { kind: "float"; data: Float } | { kind: "shake" };

const subs = new Set<(e: Event) => void>();
export const onFx = (fn: (e: Event) => void) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const emit = (e: Event) => subs.forEach((s) => s(e));

const center = (el?: Element | null) => {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export const fx = {
  burst: (opts: Partial<Burst> & { at?: Element | null } = {}) => {
    const c = center(opts.at);
    emit({ kind: "burst", data: { x: opts.x ?? c.x, y: opts.y ?? c.y, colors: opts.colors, count: opts.count, spread: opts.spread, power: opts.power } });
  },
  float: (text: string, opts: { at?: Element | null; color?: string } = {}) => {
    const c = center(opts.at);
    emit({ kind: "float", data: { x: c.x, y: c.y - 10, text, color: opts.color } });
  },
  shake: () => emit({ kind: "shake" }),
};
