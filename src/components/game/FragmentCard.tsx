import { FRAGMENT_BY_TYPE, RARITY_COLOR, RARITY_LABEL, type FragmentType } from "@/lib/game/config";
import { FragmentIcon } from "../FragmentIcon";

/**
 * A collectible trading card for one fragment. Rarity sets the frame colour; epic and legendary get
 * a holographic sheen. `locked` shows an unknown silhouette; `count` adds a ×N badge.
 */
export function FragmentCard({ type, count, locked = false, size = "md", blurb = false, className = "" }: { type: FragmentType; count?: number; locked?: boolean; size?: "sm" | "md" | "lg"; blurb?: boolean; className?: string }) {
  const def = FRAGMENT_BY_TYPE[type];
  const c = RARITY_COLOR[def.rarity];
  const holo = !locked && (def.rarity === "epic" || def.rarity === "legendary");
  const dims = { sm: "w-full text-[10px]", md: "w-full text-xs", lg: "w-56 text-sm" }[size];
  const icon = { sm: 44, md: 64, lg: 110 }[size];

  return (
    <div className={`relative aspect-[3/4] select-none ${dims} ${className}`}>
      <div className={`relative flex h-full flex-col overflow-hidden rounded-2xl border-[3px] border-black ${holo ? "holo" : ""}`} style={{ background: locked ? "#1d2116" : c, boxShadow: "0 5px 0 #000" }}>
        {/* rarity ribbon */}
        <div className="flex items-center justify-between px-2 pt-1.5">
          <span className={`display truncate rounded-full border-2 border-black bg-black/80 py-px leading-none ${size === "sm" ? "px-1 text-[8px] min-[420px]:text-[10px]" : "px-1.5"}`} style={{ color: locked ? "#7b836a" : c }}>
            {locked ? "???" : RARITY_LABEL[def.rarity]}
          </span>
          {count !== undefined && count > 0 && <span className="display rounded-full border-2 border-black bg-white px-1.5 py-px leading-none text-black">×{count}</span>}
        </div>
        {/* art window */}
        <div className="relative mx-2 mt-1.5 flex flex-1 items-center justify-center overflow-hidden rounded-xl border-[3px] border-black" style={{ background: locked ? "#0e100a" : `radial-gradient(circle at 50% 40%, #2a2f1e 0%, #0e100a 75%)` }}>
          {!locked && <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 45%, ${c}55, transparent 60%)` }} />}
          <div className="relative" style={locked ? { filter: "brightness(0) opacity(.55)" } : undefined}>
            <FragmentIcon type={type} size={icon} />
          </div>
          {locked && <span className="display absolute text-3xl text-white/25">?</span>}
        </div>
        {/* name plate */}
        <div className={`my-1.5 rounded-lg border-2 border-black bg-black/85 py-1 text-center ${size === "sm" ? "mx-1.5 px-1" : "mx-2 px-1.5"}`}>
          <div className={`display truncate leading-tight ${size === "sm" ? "text-[9px] min-[420px]:text-[10px]" : ""} ${locked ? "text-white/40" : "text-white"}`}>{locked ? "Unknown" : def.name}</div>
          {blurb && !locked && <div className="mt-0.5 line-clamp-2 text-[0.85em] leading-snug text-white/65">{def.blurb}</div>}
        </div>
      </div>
    </div>
  );
}

/** The face-down back of a card (for flip reveals). */
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-[3px] border-black bg-[#1d2116] ${className}`} style={{ boxShadow: "0 5px 0 #000" }}>
      <div className="absolute inset-2 rounded-xl border-2 border-dashed border-accent/40" style={{ background: "repeating-linear-gradient(45deg, #1d2116 0 10px, #232818 10px 20px)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="" className="relative w-1/2 drop-shadow-[0_4px_0_#000]" />
    </div>
  );
}
