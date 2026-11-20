import type { FragmentType } from "@/lib/game/config";
import { DEFAULT_LOOK, LAYER_ORDER, lookFromSeed } from "@/lib/game/look";

/**
 * A Nottie built from the real collection art, one image per trait layer. Owned parts show in
 * full colour; missing parts are dark ghosts. `seed` picks a specific Nottie (the assembled one);
 * without it, the stand-in look is used. `charged` adds the goo aura used during assembly.
 * Inside an OG image pass `srcMap` (art path → PNG data URI), since satori can't read WebP.
 */
export function NottieFigure({ have, size = 260, charged = false, seed, className = "", srcMap }: { have: Partial<Record<FragmentType, boolean>>; size?: number; charged?: boolean; seed?: number; className?: string; srcMap?: Record<string, string> }) {
  const look = seed ? lookFromSeed(seed) : DEFAULT_LOOK;
  const any = Object.values(have).some(Boolean);

  return (
    <div role="img" aria-label="Your Nottie, partly assembled" className={className} style={{ position: "relative", display: "flex", width: size, height: size, borderRadius: size * 0.08, overflow: "hidden", border: "3px solid #000", background: "#1d2116" }}>
      {LAYER_ORDER.map((layer) => {
        // The shadow is built into every Nottie, so it always shows.
        const on = layer === "shadow" || !!have[layer];
        // A missing background just leaves the dark lab wall showing.
        if (layer === "background" && !on) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={layer}
            src={srcMap?.[look[layer].src] ?? look[layer].src}
            alt=""
            width={size}
            height={size}
            draggable={false}
            style={{ position: "absolute", inset: 0, width: size, height: size, ...(on ? {} : { filter: "brightness(0)", opacity: any ? 0.35 : 0.5 }) }}
          />
        );
      })}
      {charged && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 55%, rgba(205,255,0,.45), rgba(205,255,0,0) 65%)" }} />}
    </div>
  );
}
