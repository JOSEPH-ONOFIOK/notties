import type { FragmentType } from "@/lib/game/config";

/**
 * A Nottie being assembled. Each owned fragment draws its part in full colour; missing parts are
 * dashed ghost outlines. `charged` adds the goo aura + glow used during assembly.
 */
export function NottieFigure({ have, size = 260, charged = false, className = "" }: { have: Partial<Record<FragmentType, boolean>>; size?: number; charged?: boolean; className?: string }) {
  const lime = "#cdff00";
  const limeDark = "#9fc400";
  const ink = "#000";
  const ghost = { fill: "none", stroke: "#5c6646", strokeWidth: 2.5, strokeDasharray: "6 5" } as const;
  const on = (t: FragmentType) => !!have[t];
  const any = Object.values(have).some(Boolean);

  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 200 250" className={className} role="img" aria-label="Your Nottie, partly assembled">
      <defs>
        <radialGradient id="aura" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={lime} stopOpacity=".55" />
          <stop offset="1" stopColor={lime} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="body" x1="0" x2="1">
          <stop offset="0" stopColor={lime} />
          <stop offset=".75" stopColor={lime} />
          <stop offset="1" stopColor={limeDark} />
        </linearGradient>
      </defs>

      {/* goo aura */}
      {(on("goo") || charged) && <ellipse cx="100" cy="125" rx="98" ry="118" fill="url(#aura)" opacity={charged ? 1 : 0.7} />}

      {/* floor shadow */}
      <ellipse cx="100" cy="238" rx="62" ry="8" fill="#000" opacity=".45" />

      {/* boots */}
      {on("boots") ? (
        <g stroke={ink} strokeWidth="3">
          <path d="M66 214h26v18H58a6 6 0 0 1 0-12h8z" fill="#141414" />
          <path d="M108 214h26v6h8a6 6 0 0 1 0 12h-34z" fill="#141414" />
          <path d="M60 226h30M112 226h30" stroke={lime} strokeWidth="2" />
        </g>
      ) : (
        <g {...ghost}>
          <path d="M66 214h26v18H58a6 6 0 0 1 0-12h8z" />
          <path d="M108 214h26v6h8a6 6 0 0 1 0 12h-34z" />
        </g>
      )}
      {/* legs */}
      <g stroke={ink} strokeWidth="3" fill={lime}>
        <rect x="70" y="196" width="16" height="22" rx="4" />
        <rect x="114" y="196" width="16" height="22" rx="4" />
      </g>

      {/* arms */}
      <g stroke={ink} strokeWidth="3" fill={lime}>
        <path d="M46 118c-14 12-20 34-18 54" fill="none" strokeWidth="12" stroke={ink} strokeLinecap="round" />
        <path d="M46 118c-14 12-20 34-18 54" fill="none" strokeWidth="7" stroke={lime} strokeLinecap="round" />
        <path d="M154 118c14 12 20 34 18 54" fill="none" strokeWidth="12" stroke={ink} strokeLinecap="round" />
        <path d="M154 118c14 12 20 34 18 54" fill="none" strokeWidth="7" stroke={lime} strokeLinecap="round" />
      </g>

      {/* body capsule */}
      <rect x="45" y="22" width="110" height="185" rx="55" fill={any ? "url(#body)" : "#2a3020"} stroke={ink} strokeWidth="3.5" />
      <path d="M62 60c4-14 14-24 26-28" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".45" fill="none" />

      {/* overalls */}
      {on("overalls") ? (
        <g stroke={ink} strokeWidth="3">
          <path d="M45 150h110v10a47 47 0 0 1-47 47h-16a47 47 0 0 1-47-47z" fill="#2f7ab5" />
          <rect x="74" y="132" width="52" height="30" rx="4" fill="#2f7ab5" />
          <path d="M52 118l22 16M148 118l-22 16" strokeWidth="6" stroke="#2f7ab5" />
          <path d="M52 118l22 16M148 118l-22 16" strokeWidth="1.5" stroke={ink} fill="none" />
          <rect x="88" y="140" width="24" height="14" rx="3" fill="#2059a0" />
          <circle cx="76" cy="136" r="3.5" fill={lime} />
          <circle cx="124" cy="136" r="3.5" fill={lime} />
        </g>
      ) : (
        <g {...ghost}>
          <path d="M45 150h110v10a47 47 0 0 1-47 47h-16a47 47 0 0 1-47-47z" />
          <rect x="74" y="132" width="52" height="30" rx="4" />
        </g>
      )}

      {/* portal shard on the bib */}
      {on("shard") ? (
        <g>
          <circle cx="100" cy="147" r="13" fill="#ffb347" opacity=".35" />
          <path d="M100 136l4 7 7 2-5 6 1 7-7-3-7 3 1-7-5-6 7-2z" fill="#ffb347" stroke={ink} strokeWidth="2" />
        </g>
      ) : (
        <path d="M100 136l4 7 7 2-5 6 1 7-7-3-7 3 1-7-5-6 7-2z" {...ghost} strokeWidth="2" />
      )}

      {/* goggles */}
      {on("goggles") ? (
        <g stroke={ink} strokeWidth="3">
          <rect x="43" y="70" width="114" height="12" rx="3" fill="#1a1a1a" />
          <path d="M76 56l14 8v16l-14 8-14-8V64z" fill="#9aa08f" />
          <path d="M124 56l14 8v16l-14 8-14-8V64z" fill="#9aa08f" />
          <circle cx="76" cy="72" r="10" fill="#f4f7eb" />
          <circle cx="124" cy="72" r="10" fill="#f4f7eb" />
          <circle cx="78" cy="73" r="4.5" fill="#6b4a2a" strokeWidth="1.5" />
          <circle cx="126" cy="73" r="4.5" fill="#6b4a2a" strokeWidth="1.5" />
          <circle cx="79" cy="72" r="1.6" fill={ink} stroke="none" />
          <circle cx="127" cy="72" r="1.6" fill={ink} stroke="none" />
        </g>
      ) : (
        <g {...ghost}>
          <path d="M76 56l14 8v16l-14 8-14-8V64z" />
          <path d="M124 56l14 8v16l-14 8-14-8V64z" />
        </g>
      )}

      {/* mouth */}
      <path d={on("goggles") ? "M86 104q14 12 28 0" : "M90 106h20"} stroke={ink} strokeWidth="3" fill={on("goggles") ? "#7a1f1f" : "none"} strokeLinecap="round" />

      {/* hair tuft */}
      {on("tuft") ? (
        <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M100 24c-4-12-2-18 4-22" />
          <path d="M92 25c-8-8-10-14-8-20" />
          <path d="M108 25c6-9 12-12 18-12" />
          <path d="M84 28c-8-4-12-8-14-14" />
        </g>
      ) : (
        <g {...ghost} strokeDasharray="3 4">
          <path d="M100 24c-4-12-2-18 4-22" />
          <path d="M108 25c6-9 12-12 18-12" />
        </g>
      )}

      {/* gloves */}
      {on("gloves") ? (
        <g stroke={ink} strokeWidth="3" fill="#141414">
          <circle cx="28" cy="176" r="11" />
          <circle cx="172" cy="176" r="11" />
          <path d="M22 170h12M166 170h12" stroke={lime} strokeWidth="1.5" />
        </g>
      ) : (
        <g {...ghost}>
          <circle cx="28" cy="176" r="11" />
          <circle cx="172" cy="176" r="11" />
        </g>
      )}

      {/* goo vial on the belt */}
      {on("goo") ? (
        <g stroke={ink} strokeWidth="2.5">
          <rect x="136" y="152" width="14" height="22" rx="5" fill={lime} />
          <rect x="138" y="146" width="10" height="7" rx="2" fill="#141414" />
          <circle cx="141" cy="162" r="2" fill="#fff" stroke="none" />
        </g>
      ) : (
        <rect x="136" y="152" width="14" height="22" rx="5" {...ghost} strokeWidth="2" />
      )}

      {/* Vlad's notebook in the left glove */}
      {on("notebook") ? (
        <g stroke={ink} strokeWidth="2.5" transform="rotate(-12 20 192)">
          <rect x="6" y="178" width="26" height="32" rx="3" fill="#a0522d" />
          <path d="M12 186h14M12 192h14M12 198h9" stroke="#f1d9b5" strokeWidth="2" />
        </g>
      ) : (
        <rect x="6" y="178" width="26" height="32" rx="3" {...ghost} strokeWidth="2" transform="rotate(-12 20 192)" />
      )}

      {charged && (
        <g stroke={lime} strokeWidth="3" fill="none" strokeLinecap="round" style={{ animation: "zap .5s linear infinite" }}>
          <path d="M20 40l14 16-8 4 16 18" />
          <path d="M182 50l-14 14 8 6-14 16" />
          <path d="M100 0v10" />
        </g>
      )}
    </svg>
  );
}
