"use client";

/** Browser-side helpers. The server decides everything; these just call it and show the answer. */

export function idem() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
  if (!res.ok || data.ok === false) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

/**
 * Server clock offset. Every countdown (crate timers, events) uses server time, so a wrong phone
 * clock can't make timers lie and everyone sees events flip at the same moment.
 */
let offset = 0;
export function syncClock(serverNowIso: string) {
  const s = Date.parse(serverNowIso);
  if (!Number.isNaN(s)) offset = s - Date.now();
}
export const serverNow = () => Date.now() + offset;

export function timeLeft(iso: string | null | undefined, now = serverNow()) {
  if (!iso) return 0;
  return Math.max(0, new Date(iso).getTime() - now);
}

export function fmtDuration(ms: number) {
  const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, "0")}m`;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s` : `${m}m ${String(sec).padStart(2, "0")}s`;
}

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
