"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      execute: (id: string) => void;
      reset: (id: string) => void;
      getResponse: (id: string) => string | undefined;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
let loading: Promise<void> | null = null;
function load() {
  if (typeof window === "undefined" || window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Invisible Cloudflare Turnstile for in-game actions. `getToken()` resolves with a fresh token (or
 * "" when Turnstile isn't configured). Only shows a challenge if Cloudflare thinks it must.
 */
export function useTurnstile() {
  const host = useRef<HTMLDivElement | null>(null);
  const id = useRef<string | null>(null);
  const waiter = useRef<((t: string) => void) | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    load()
      .then(() => {
        if (cancelled || !host.current || !window.turnstile || id.current) return;
        id.current = window.turnstile.render(host.current, {
          sitekey: SITE_KEY,
          execution: "execute",
          appearance: "interaction-only",
          callback: (t: string) => {
            waiter.current?.(t);
            waiter.current = null;
          },
          "error-callback": () => {
            waiter.current?.("");
            waiter.current = null;
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    if (!SITE_KEY || !window.turnstile || !id.current) return "";
    const t = window.turnstile;
    const wid = id.current;
    t.reset(wid);
    return new Promise<string>((res) => {
      waiter.current = res;
      t.execute(wid);
      setTimeout(() => {
        if (waiter.current === res) {
          waiter.current = null;
          res("");
        }
      }, 15000);
    });
  }, []);

  const Widget = useCallback(() => <div ref={host} className="flex justify-center" />, []);
  return { getToken, Widget, enabled: !!SITE_KEY };
}

/** Visible (managed) widget inside a plain HTML form: adds `cf-turnstile-response` to the submit. */
export function TurnstileField() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY) return;
    let wid: string | null = null;
    load()
      .then(() => {
        if (el.current && window.turnstile && !wid) wid = window.turnstile.render(el.current, { sitekey: SITE_KEY, theme: "dark" });
      })
      .catch(() => {});
  }, []);
  if (!SITE_KEY) return null;
  return <div ref={el} className="flex justify-center" />;
}
