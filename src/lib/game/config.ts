/**
 * The Notties game content. Shared by server and client (no secrets here).
 *
 * Theme: Vlad's lab under Robinhood City is leaking. Portal Crates wash up every couple of hours
 * holding one Fragment each. Collect one of every fragment, and the Lab can assemble you a
 * Nottie — which makes you "One of Us" and books your guaranteed mint spot.
 *
 * Points are called TROUBLE. You cause it, you earn it.
 */

export const POINTS_NAME = "TROUBLE";
export const BRAND = {
  name: "The Notties",
  site: "https://thenotties.xyz",
  x: "https://x.com/thenottiesworld",
  xHandle: "@thenottiesworld",
  supply: 5760,
  city: "Robinhood City",
};

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type FragmentType = "goggles" | "overalls" | "gloves" | "boots" | "tuft" | "goo" | "notebook" | "shard";

export interface FragmentDef {
  type: FragmentType;
  name: string;
  rarity: Rarity;
  weight: number; // default drop weight (admin-editable in settings.drop_weights)
  pawn: number; // default buyback in TROUBLE (admin-editable in settings.pawn_prices)
  blurb: string;
}

export const FRAGMENTS: FragmentDef[] = [
  { type: "goggles", name: "Goggles", rarity: "common", weight: 20, pawn: 10, blurb: "Standard issue. Every Nottie came through the portal wearing a pair. Nobody knows who issued them." },
  { type: "overalls", name: "Overalls", rarity: "common", weight: 20, pawn: 10, blurb: "One pocket. Always something in it that isn't yours." },
  { type: "gloves", name: "Gloves", rarity: "uncommon", weight: 15, pawn: 10, blurb: "Black, fingerless-ish, leaves no prints. Hood's idea." },
  { type: "boots", name: "Boots", rarity: "uncommon", weight: 15, pawn: 10, blurb: "Built for running from Vlad. Doubles as running toward snacks." },
  { type: "tuft", name: "Hair Tuft", rarity: "uncommon", weight: 13, pawn: 15, blurb: "Mohawk, mop, or three brave strands. Decides your whole personality." },
  { type: "goo", name: "Green Goo Vial", rarity: "rare", weight: 8, pawn: 30, blurb: "Raw Sherwood energy. Do not drink. Woody drank it." },
  { type: "notebook", name: "Vlad's Notebook", rarity: "epic", weight: 6, pawn: 75, blurb: "Half the assembly instructions. The other half is a sandwich stain." },
  { type: "shard", name: "Portal Shard", rarity: "legendary", weight: 3, pawn: 150, blurb: "A splinter of the portal itself. Still warm. Still humming. The last piece." },
];

export const FRAGMENT_BY_TYPE = Object.fromEntries(FRAGMENTS.map((f) => [f.type, f])) as Record<FragmentType, FragmentDef>;
export const FRAGMENT_TYPES = FRAGMENTS.map((f) => f.type);

/** One of each fragment assembles a Nottie. */
export const DEFAULT_RECIPE: Record<FragmentType, number> = {
  goggles: 1,
  overalls: 1,
  gloves: 1,
  boots: 1,
  tuft: 1,
  goo: 1,
  notebook: 1,
  shard: 1,
};

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#b8bea9",
  uncommon: "#8ad7ff",
  rare: "#cdff00",
  epic: "#d79cff",
  legendary: "#ffb347",
};

export const DEFAULT_SETTINGS = {
  claims_enabled: true,
  forge_enabled: true,
  trade_enabled: true,
  pawn_enabled: true,
  crate_cooldown_minutes: 120,
  referral_qualify_claims: 3, // referee must open this many crates before the referrer is paid
  pity_threshold: 10, // crates without a Rare+ before the next one is guaranteed Rare or better
  crate_price: 500, // TROUBLE for a bonus crate from the shop
  crate_buys_per_day: 2,
  shop_enabled: true,
  streak_bonus: [10, 15, 20, 25, 30, 40, 60], // daily roll call reward by streak day (repeats the last)
  // Recurring events run on the server's UTC clock, so every player sees the same thing at once.
  recurring_events: [
    { key: "shard_storm", name: "Shard Storm", kind: "shard_storm", days: [6, 0], start_hour: 0, end_hour: 24, effects: { drop_mult: { shard: 2, notebook: 1.5 } }, enabled: true },
    { key: "double_trouble", name: "Double Trouble Hour", kind: "double_trouble", days: [1, 2, 3, 4, 5], start_hour: 20, end_hour: 21, effects: { points_mult: 2 }, enabled: true },
  ] as RecurringEvent[],
  mint: { date: "", chain: "", price: "" },
  drop_weights: Object.fromEntries(FRAGMENTS.map((f) => [f.type, f.weight])) as Record<FragmentType, number>,
  pawn_prices: Object.fromEntries(FRAGMENTS.map((f) => [f.type, f.pawn])) as Record<FragmentType, number>,
  recipe: DEFAULT_RECIPE,
  points: {
    crate: 5,
    onboarding: 25,
    follow_x: 50,
    link_wallet: 30,
    daily_checkin: 10,
    referral: 100,
    forge: 250,
    first_trade: 20,
  },
};
export type Settings = typeof DEFAULT_SETTINGS;

export type EventEffects = { drop_mult?: Partial<Record<FragmentType, number>>; points_mult?: number; cooldown_mult?: number };
export type RecurringEvent = { key: string; name: string; kind: string; days: number[]; start_hour: number; end_hour: number; effects: EventEffects; enabled: boolean };

export const EVENT_STYLE: Record<string, { color: string; blurb: string }> = {
  shard_storm: { color: "#ffb347", blurb: "Portal Shards drop twice as often. Notebooks too, a bit." },
  double_trouble: { color: "#cdff00", blurb: "Every TROUBLE reward is doubled." },
  rush_hour: { color: "#8ad7ff", blurb: "Crate timers run twice as fast." },
  custom: { color: "#d79cff", blurb: "Something weird is happening in the lab." },
};

export const FACTIONS = [
  { id: "robin", name: "Team Robin", motto: "Follow the leader. He insists.", img: "/characters/Robin.webp", color: "#cdff00" },
  { id: "hood", name: "Team Hood", motto: "What's yours is ours.", img: "/characters/Hood.webp", color: "#8ad7ff" },
  { id: "dild", name: "Team Dild", motto: "Nobody knows. That's the point.", img: "/characters/Dild.webp", color: "#d79cff" },
  { id: "woody", name: "Team Woody", motto: "Every corner. Twice.", img: "/characters/Woody.webp", color: "#ffb347" },
] as const;
export type FactionId = (typeof FACTIONS)[number]["id"];

export type PlayerStatus = "registered" | "collecting" | "ready" | "assembled" | "gtd" | "minted";
export const STATUS_LABEL: Record<PlayerStatus, string> = {
  registered: "Registered",
  collecting: "Collecting",
  ready: "Ready to Assemble",
  assembled: "One of Us",
  gtd: "GTD Locked",
  minted: "Minted",
};

export const ORIGINAL_FOUR = [
  { name: "Robin", line: "The self-appointed leader", img: "/characters/Robin.webp" },
  { name: "Hood", line: "The light-fingered one", img: "/characters/Hood.webp" },
  { name: "Dild", line: "The beautiful mystery", img: "/characters/Dild.webp" },
  { name: "Woody", line: "The restless explorer", img: "/characters/Woody.webp" },
];

export const TEASERS = ["202", "6", "248", "79", "329", "8", "221", "86"].map((n) => `/notties/${n}.webp`);
