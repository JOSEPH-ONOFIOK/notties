/**
 * The Notties game content. Shared by server and client (no secrets here).
 *
 * Theme: Vlad's lab under Robinhood City is leaking. Portal Crates wash up every couple of hours
 * holding one Fragment each. Collect one of every fragment, and the Lab can assemble you a
 * Nottie — which makes you "One of Us" and books your guaranteed mint spot.
 *
 * The in-game token is $NOTTIES. Earn it, spend it on chests and parts.
 */

export const POINTS_NAME = "$NOTTIES";
export const BRAND = {
  name: "The Notties",
  /** The main Notties site. The game links back to it. */
  site: "https://thenotties.xyz",
  /** Where this game lives. */
  app: "https://nottiesraid.fun",
  x: "https://x.com/thenottiesworld",
  xHandle: "@thenottiesworld",
  supply: 5760,
  city: "Robinhood City",
};

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * The eight parts match the eight trait layers of the real collection art (public/traits). Collect
 * one of each to assemble. Vlad's Book is not a part: it never drops from crates, isn't needed to
 * assemble, and only a few players will ever hold one.
 */
export type FragmentType = "background" | "shadow" | "body" | "shoes" | "outfit" | "mouth" | "eyes" | "gear" | "book";

export interface FragmentDef {
  type: FragmentType;
  name: string;
  rarity: Rarity;
  weight: number; // default drop weight (admin-editable in settings.drop_weights)
  pawn: number; // default buyback in $NOTTIES (admin-editable in settings.pawn_prices)
  blurb: string;
  /** Not a crate part: no drops, not in the recipe. */
  special?: boolean;
  /** Built into every Nottie (the shadow fits every character), so it isn't collected or traded. */
  fixed?: boolean;
}

export const FRAGMENTS: FragmentDef[] = [
  { type: "background", name: "Background", rarity: "common", weight: 24, pawn: 10, blurb: "The wall behind you. Grey, yellow, or that green that hurts to look at." },
  { type: "shadow", name: "Shadow", rarity: "common", weight: 0, pawn: 10, fixed: true, blurb: "Every Nottie came through the portal with one. Some came with the wrong one." },
  { type: "shoes", name: "Shoes", rarity: "uncommon", weight: 16, pawn: 10, blurb: "Sneakers, slippers or Timbs. Built for running from Vlad. Doubles as running toward snacks." },
  { type: "mouth", name: "Mouth", rarity: "uncommon", weight: 14, pawn: 15, blurb: "Smile, sulk, tongue out or vampire teeth. Decides your whole personality." },
  { type: "outfit", name: "Outfit", rarity: "uncommon", weight: 12, pawn: 15, blurb: "Jackets, capes, prison stripes, pampers. One pocket. Always something in it that isn't yours." },
  { type: "eyes", name: "Eyes", rarity: "rare", weight: 7, pawn: 30, blurb: "One eye, two eyes, three eyes, wooden eyes. Hood swears the goggles help." },
  { type: "gear", name: "Hand & Head", rarity: "epic", weight: 3.5, pawn: 75, blurb: "Sword, rose, snack pack or a head that's on fire. Whatever they grabbed on the way out." },
  { type: "body", name: "Body", rarity: "legendary", weight: 1.5, pawn: 150, blurb: "The Nottie itself. Nerd, fat, tall or mini, sometimes skeleton. Still warm from the portal. The last piece." },
  { type: "book", name: "Vlad's Book", rarity: "legendary", weight: 0, pawn: 500, special: true, blurb: "The real assembly instructions. Vlad wants it back. Almost nobody will ever hold one." },
];

export const FRAGMENT_BY_TYPE = Object.fromEntries(FRAGMENTS.map((f) => [f.type, f])) as Record<FragmentType, FragmentDef>;
export const FRAGMENT_TYPES = FRAGMENTS.map((f) => f.type);
/** The seven parts you collect from crates to assemble (not Vlad's Book, not the built-in shadow). */
export const PARTS = FRAGMENTS.filter((f) => !f.special && !f.fixed);
/** True for parts players actually collect, trade and buy (not Vlad's Book, not the built-in shadow). */
export const isPart = (t: string) => PARTS.some((f) => f.type === t);
export const PART_TYPES = PARTS.map((f) => f.type);

/** One of each part assembles a Nottie. Vlad's Book is not required. */
export const DEFAULT_RECIPE: Record<FragmentType, number> = {
  background: 1,
  shadow: 0, // built into every Nottie
  shoes: 1,
  mouth: 1,
  outfit: 1,
  eyes: 1,
  gear: 1,
  body: 1,
  book: 0,
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
  // Free timer crate (one every crate_cooldown_minutes). Off: after the welcome crate, crates are bought.
  timer_crates: false,
  crate_cooldown_minutes: 120,
  referral_qualify_claims: 0, // crates the recruit must open before the recruiter is paid (0 = none)
  pity_threshold: 10, // crates without a Rare+ before the next one is guaranteed Rare or better
  crate_price: 500, // $NOTTIES for a crate from the shop
  crate_buys_per_day: 1000, // cap per UTC day (effectively none)
  crate_buy_cooldown_minutes: 0, // 0 = buy crates any time
  shop_enabled: true,
  streak_bonus: [50, 60, 70, 80, 90, 100, 150], // daily roll call reward by streak day (repeats the last)
  // Recurring events run on the server's UTC clock, so every player sees the same thing at once.
  recurring_events: [
    { key: "shard_storm", name: "Portal Storm", kind: "shard_storm", days: [6, 0], start_hour: 0, end_hour: 24, effects: { drop_mult: { body: 2, gear: 1.5 } }, enabled: true },
    { key: "double_trouble", name: "Double $NOTTIES Hour", kind: "double_trouble", days: [1, 2, 3, 4, 5], start_hour: 20, end_hour: 21, effects: { points_mult: 2 }, enabled: true },
  ] as RecurringEvent[],
  // The mint is free. `price` stays in the shape so older saved rows still load; it always reads "Free".
  mint: { date: "", chain: "", price: "Free" },
  // Vlad's Book: max copies ever given out. 0 = no limit (anyone who earns it gets one).
  book_cap: 0,
  // Missions with a deadline pay in full until it, then late_reward_pct of the reward for
  // late_window_hours more, then disappear.
  // Missions a player must finish (after building their Nottie) before they can submit a wallet.
  wallet_tasks: ["follow_x", "like_post", "rt_post"] as string[],
  late_reward_pct: 50,
  late_window_hours: 24,
  // Marketplace: buy parts directly with $NOTTIES. Rare parts cost a lot on purpose.
  market_enabled: true,
  market_prices: { background: 1500, shadow: 0, shoes: 2000, mouth: 2500, outfit: 3000, eyes: 5000, gear: 12000, body: 25000, book: 0 } as Record<FragmentType, number>,
  // Free crates sent to the mailbox: on sign-up, and to the recruiter when a recruit plays.
  welcome_crates: 1,
  referral_crates: 0,
  // Optional: a mission a recruit must also finish (e.g. "engage the launch post") before the
  // recruiter is paid. Empty = opening crates is enough.
  referral_task: "like_post",
  drop_weights: Object.fromEntries(FRAGMENTS.map((f) => [f.type, f.weight])) as Record<FragmentType, number>,
  pawn_prices: Object.fromEntries(FRAGMENTS.map((f) => [f.type, f.pawn])) as Record<FragmentType, number>,
  recipe: DEFAULT_RECIPE,
  points: {
    crate: 10,
    onboarding: 150,
    follow_x: 150,
    link_wallet: 150,
    daily_checkin: 50,
    daily_gift: 50,
    referral: 150,
    forge: 500,
    first_trade: 50,
  },
};
export type Settings = typeof DEFAULT_SETTINGS;

export type EventEffects = { drop_mult?: Partial<Record<FragmentType, number>>; points_mult?: number; cooldown_mult?: number };
export type RecurringEvent = { key: string; name: string; kind: string; days: number[]; start_hour: number; end_hour: number; effects: EventEffects; enabled: boolean };

export const EVENT_STYLE: Record<string, { color: string; blurb: string }> = {
  shard_storm: { color: "#ffb347", blurb: "Bodies drop twice as often. Hand & Head too, a bit." },
  double_trouble: { color: "#cdff00", blurb: "Every $NOTTIES reward is doubled." },
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
