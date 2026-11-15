"use client";

import { useState } from "react";
import { TbCheck, TbCopy } from "react-icons/tb";
import { FaXTwitter } from "react-icons/fa6";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className={`btn btn-ghost text-sm ${className}`}
    >
      {done ? <TbCheck size={16} strokeWidth={3} /> : <TbCopy size={16} strokeWidth={2.4} />}
      {done ? "Copied" : label}
    </button>
  );
}

export function ShareOnX({ text, url }: { text: string; url: string }) {
  const href = `https://x.com/intent/post?${new URLSearchParams({ text, url })}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="btn btn-accent text-sm">
      <FaXTwitter size={15} /> Share
    </a>
  );
}

/** Share one of your own cards (Nottie / wanted poster) on X; links to the share page with your ref. */
export function ShareCard({ kind, id, text, label = "Share", className = "btn btn-ghost text-sm" }: { kind: "nottie" | "wanted"; id: string; text: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.open(`https://x.com/intent/post?${new URLSearchParams({ text, url: `${window.location.origin}/s/${kind}/${id}` })}`, "_blank", "noopener")}
      className={className}
    >
      <FaXTwitter size={15} /> {label}
    </button>
  );
}
