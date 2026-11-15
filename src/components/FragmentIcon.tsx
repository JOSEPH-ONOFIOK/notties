import { RARITY_COLOR, type FragmentType, FRAGMENT_BY_TYPE } from "@/lib/game/config";

/**
 * Inline SVG icons for the eight fragments, drawn in the Notties palette. Pure markup, so they work
 * in server components and client components alike.
 */
export function FragmentIcon({ type, size = 48, className = "" }: { type: FragmentType; size?: number; className?: string }) {
  const lime = "#cdff00";
  const dark = "#0a0b08";
  const grey = "#9aa08f";
  const white = "#f4f7eb";
  const rare = RARITY_COLOR[FRAGMENT_BY_TYPE[type].rarity];
  const common = { width: size, height: size, viewBox: "0 0 64 64", fill: "none", className, "aria-hidden": true as const };

  switch (type) {
    case "goggles":
      return (
        <svg {...common}>
          <rect x="4" y="27" width="56" height="10" rx="3" fill={dark} />
          <circle cx="22" cy="32" r="13" fill={grey} stroke={dark} strokeWidth="3" />
          <circle cx="42" cy="32" r="13" fill={grey} stroke={dark} strokeWidth="3" />
          <circle cx="22" cy="32" r="8" fill={white} />
          <circle cx="42" cy="32" r="8" fill={white} />
          <circle cx="24" cy="33" r="3.2" fill="#6b4a2a" />
          <circle cx="44" cy="33" r="3.2" fill="#6b4a2a" />
          <circle cx="25" cy="32" r="1.1" fill={dark} />
          <circle cx="45" cy="32" r="1.1" fill={dark} />
        </svg>
      );
    case "overalls":
      return (
        <svg {...common}>
          <path d="M16 8h8v14h16V8h8v48H16z" fill="#2b6ea3" />
          <path d="M16 22h32v34H16z" fill="#2f7ab5" />
          <rect x="24" y="30" width="16" height="12" rx="2" fill="#2059a0" stroke={dark} strokeWidth="2" />
          <circle cx="24" cy="21" r="2.5" fill={lime} />
          <circle cx="40" cy="21" r="2.5" fill={lime} />
          <path d="M16 56h32" stroke={dark} strokeWidth="3" />
        </svg>
      );
    case "gloves":
      return (
        <svg {...common}>
          <path d="M18 54V30c0-3 2-5 5-5h2v-8a3 3 0 0 1 6 0v8h2v-11a3 3 0 0 1 6 0v11h2v-8a3 3 0 0 1 6 0v8h1a4 4 0 0 1 4 4v15c0 6-5 10-11 10H28c-6 0-10-4-10-10z" fill={dark} />
          <path d="M22 50h22" stroke={lime} strokeWidth="2" />
          <path d="M24 44h18" stroke="#2d3324" strokeWidth="2" />
        </svg>
      );
    case "boots":
      return (
        <svg {...common}>
          <path d="M14 12h22v22l18 10v8H14z" fill={dark} />
          <path d="M14 46h40v6H14z" fill="#3a3f33" />
          <path d="M36 34l18 10" stroke={lime} strokeWidth="2" />
          <path d="M18 18h14M18 24h14" stroke="#3a3f33" strokeWidth="2.5" />
          <circle cx="23" cy="30" r="1.6" fill={lime} />
          <circle cx="29" cy="30" r="1.6" fill={lime} />
        </svg>
      );
    case "tuft":
      return (
        <svg {...common}>
          <path d="M8 44c6-10 10-20 24-24-2 6-4 10-5 15 6-4 12-10 21-11-4 6-7 11-9 16 6-2 12-4 17-3-8 6-16 11-22 19-9-2-18-6-26-12z" fill={dark} />
          <path d="M14 42c6-6 12-10 18-12" stroke="#3a3f33" strokeWidth="2" />
          <ellipse cx="32" cy="56" rx="22" ry="5" fill={lime} opacity="0.5" />
        </svg>
      );
    case "goo":
      return (
        <svg {...common}>
          <rect x="24" y="4" width="16" height="8" rx="2" fill={dark} />
          <path d="M26 12h12v10l10 18v12a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V40l10-18z" fill="#dfe6d6" opacity="0.35" stroke={white} strokeWidth="2" />
          <path d="M19 42l7-13h12l7 13v10a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4z" fill={lime} />
          <circle cx="30" cy="46" r="2" fill={white} opacity="0.9" />
          <circle cx="37" cy="40" r="1.4" fill={white} opacity="0.8" />
          <circle cx="26" cy="38" r="1" fill={white} opacity="0.8" />
        </svg>
      );
    case "notebook":
      return (
        <svg {...common}>
          <rect x="14" y="8" width="36" height="48" rx="4" fill="#7a3b1e" />
          <rect x="20" y="8" width="30" height="48" rx="3" fill="#a0522d" />
          <rect x="20" y="8" width="30" height="48" rx="3" fill="url(#n)" />
          <path d="M26 20h18M26 28h18M26 36h12" stroke="#f1d9b5" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="42" cy="44" r="5" fill={rare} opacity="0.9" />
          <path d="M17 14v38" stroke={dark} strokeWidth="2" strokeDasharray="2 4" />
          <defs>
            <linearGradient id="n" x1="0" x2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.25" />
              <stop offset="0.3" stopColor="#000" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "shard":
      return (
        <svg {...common}>
          <path d="M32 4l10 18 14 6-10 14 2 18-16-8-16 8 2-18L8 28l14-6z" fill={rare} />
          <path d="M32 4l10 18-10 8-10-8z" fill="#ffe09a" />
          <path d="M22 22l10 8 10-8-10 20z" fill="#ff8a1f" opacity="0.8" />
          <path d="M32 30v24" stroke="#fff3cf" strokeWidth="2" opacity="0.6" />
          <circle cx="32" cy="30" r="3" fill={white} />
        </svg>
      );
  }
}
