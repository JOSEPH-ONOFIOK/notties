/**
 * Player level, derived from lifetime $NOTTIES (spent points still count as XP).
 * Level n starts at 25·n·(n−1): L2 = 50, L3 = 150, L4 = 300, L5 = 500, L6 = 750 …
 * Display only — no gameplay or eligibility depends on it.
 */

const startOf = (n: number) => 25 * n * (n - 1);

export function levelInfo(xp: number) {
  let n = 1;
  while (startOf(n + 1) <= xp) n++;
  const from = startOf(n);
  const to = startOf(n + 1);
  return { level: n, title: titleFor(n), into: xp - from, span: to - from, pct: Math.round(((xp - from) / (to - from)) * 100), next: to };
}

const TITLES: [number, string][] = [
  [16, "Legend of Robinhood"],
  [12, "Public Enemy"],
  [8, "Outlaw"],
  [5, "Menace"],
  [3, "Troublemaker"],
  [2, "Pickpocket"],
  [1, "Stray"],
];
export const titleFor = (n: number) => TITLES.find(([min]) => n >= min)![1];

export const RARITY_TIER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 } as const;
