import { TRAITS, type Trait, type TraitLayer, type TraitTier } from "./traits";

/** Bottom to top: the order the art layers stack in. */
export const LAYER_ORDER: TraitLayer[] = ["background", "shadow", "body", "shoes", "outfit", "mouth", "eyes", "gear"];

export const TRAITS_BY_LAYER = Object.fromEntries(LAYER_ORDER.map((l) => [l, TRAITS.filter((t) => t.layer === l)])) as Record<TraitLayer, Trait[]>;

const find = (layer: TraitLayer, src: string) => TRAITS_BY_LAYER[layer].find((t) => t.src.endsWith(src))!;

export type Look = Record<TraitLayer, Trait>;

/** The stand-in Nottie on the bench before anyone assembles. Also the art on each part's card. */
export const DEFAULT_LOOK: Look = {
  background: find("background", "common-grey.webp"),
  shadow: find("shadow", "common-shadow-3.webp"),
  body: find("body", "common-fat.webp"),
  shoes: find("shoes", "common-main-shoe.webp"),
  outfit: find("outfit", "common-red-jacket.webp"),
  mouth: find("mouth", "common-smile.webp"),
  eyes: find("eyes", "common-2-eyes.webp"),
  gear: find("gear", "legendary-sword.webp"),
};

const TIER_WEIGHT: Record<TraitTier, number> = { common: 70, rare: 25, legendary: 5 };

/** Small deterministic PRNG so the same seed always gives the same Nottie. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A full Nottie from a seed: one trait per layer, rarer tiers show up less often. */
export function lookFromSeed(seed: number): Look {
  const r = rng(seed);
  return Object.fromEntries(
    LAYER_ORDER.map((layer) => {
      const pool = TRAITS_BY_LAYER[layer];
      const total = pool.reduce((n, t) => n + TIER_WEIGHT[t.tier], 0);
      let x = r() * total;
      const pick = pool.find((t) => (x -= TIER_WEIGHT[t.tier]) < 0) ?? pool[pool.length - 1];
      return [layer, pick];
    }),
  ) as Look;
}
