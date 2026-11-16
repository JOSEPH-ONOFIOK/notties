import { RARITY_COLOR, type FragmentType, FRAGMENT_BY_TYPE } from "@/lib/game/config";
import { DEFAULT_LOOK } from "@/lib/game/look";

/**
 * The picture for a fragment. The eight parts use the real collection art (public/traits);
 * Vlad's Book has no art in the collection, so it stays a drawn icon. Plain markup, so it works in
 * server and client components. Inside an OG image pass `srcMap` (art path → PNG data URI), since satori can't read WebP.
 */
export function FragmentIcon({ type, size = 48, className = "", srcMap }: { type: FragmentType; size?: number; className?: string; srcMap?: Record<string, string> }) {
  if (type === "book") return <BookIcon size={size} className={className} />;
  const trait = DEFAULT_LOOK[type];
  if (!trait) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={srcMap?.[trait.icon] ?? trait.icon} alt="" width={size} height={size} className={className} style={{ width: size, height: size, objectFit: "contain", borderRadius: type === "background" ? size * 0.18 : undefined }} draggable={false} />
  );
}

function BookIcon({ size, className }: { size: number; className: string }) {
  const rare = RARITY_COLOR[FRAGMENT_BY_TYPE.book.rarity];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="vlad-book" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.25" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="14" y="8" width="36" height="48" rx="4" fill="#7a3b1e" />
      <rect x="20" y="8" width="30" height="48" rx="3" fill="#a0522d" />
      <rect x="20" y="8" width="30" height="48" rx="3" fill="url(#vlad-book)" />
      <path d="M26 20h18M26 28h18M26 36h12" stroke="#f1d9b5" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="42" cy="44" r="5" fill={rare} opacity="0.9" />
      <path d="M17 14v38" stroke="#0a0b08" strokeWidth="2" strokeDasharray="2 4" />
    </svg>
  );
}
