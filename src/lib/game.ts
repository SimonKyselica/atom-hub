// Game rules shared by the server (awarding) and the client (previews, progress bars).

export const DIFFICULTIES = {
  easy: { label: "Easy", xp: 10, coins: 5 },
  medium: { label: "Medium", xp: 20, coins: 10 },
  hard: { label: "Hard", xp: 40, coins: 20 },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as Difficulty[];

export const PERFECT_DAY_BONUS = { xp: 25, coins: 15 } as const;

/** +10% per full week of streak, capped at +50%. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.floor(Math.max(streak, 0) / 7) * 0.1, 0.5);
}

export function habitReward(difficulty: Difficulty, streak: number) {
  const base = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium;
  const mult = streakMultiplier(streak);
  return { xp: Math.round(base.xp * mult), coins: Math.round(base.coins * mult), multiplier: mult };
}

export function todoReward(difficulty: Difficulty) {
  const base = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium;
  return { xp: base.xp, coins: base.coins };
}

// Levels: reaching level L takes 50·L·(L−1) total XP → 100, 300, 600, 1000, …
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (Math.max(xp, 0) * 4) / 50)) / 2));
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  return level;
}

const TITLES: [number, string][] = [
  [30, "10x Human"],
  [25, "Open Source Legend"],
  [20, "Staff Engineer"],
  [16, "Core Team"],
  [12, "Maintainer"],
  [8, "Reviewer"],
  [5, "Committer"],
  [3, "Contributor"],
  [1, "Initial Commit"],
];

export function levelTitle(level: number): string {
  return TITLES.find(([min]) => level >= min)?.[1] ?? "Initial Commit";
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: levelTitle(level),
    current: xp - floor,
    needed: next - floor,
    percent: Math.min(100, Math.round(((xp - floor) / (next - floor)) * 100)),
  };
}

// Contribution-graph palettes. Level colors live in globals.css as .pal-<name>.
export const PALETTES = ["green", "blue", "purple", "orange", "pink"] as const;
export type Palette = (typeof PALETTES)[number];

export const PALETTE_SWATCH: Record<Palette, string> = {
  green: "#39d353",
  blue: "#58a6ff",
  purple: "#bc8cff",
  orange: "#ffa657",
  pink: "#ff7eb6",
};

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function describeSchedule(days: number[], weekStart = 0): string {
  const set = new Set(days);
  if (set.size === 7) return "Every day";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  const ordered = [...ALL_DAYS.slice(weekStart), ...ALL_DAYS.slice(0, weekStart)];
  return ordered.filter((d) => set.has(d)).map((d) => WEEKDAYS_SHORT[d]).join(", ");
}

// Streak freezes: bought in the shop, used automatically on a missed day.
export const FREEZE = { cost: 100, max: 2 } as const;

// Habit mastery: 21 days to start a habit, ~66 to make it automatic (Lally et al., 2010).
export const MASTERY = [
  { key: "bronze", name: "Bronze", at: 21, icon: "🥉", coins: 25 },
  { key: "silver", name: "Silver", at: 66, icon: "🥈", coins: 75 },
  { key: "gold", name: "Gold", at: 100, icon: "🥇", coins: 150 },
  { key: "diamond", name: "Diamond", at: 365, icon: "💎", coins: 500 },
] as const;

export type MasteryTier = (typeof MASTERY)[number];

export function masteryFor(total: number) {
  const current = [...MASTERY].reverse().find((t) => total >= t.at) ?? null;
  const next = MASTERY.find((t) => total < t.at) ?? null;
  const from = current?.at ?? 0;
  return {
    current,
    next,
    percent: next ? Math.round(((total - from) / (next.at - from)) * 100) : 100,
  };
}
