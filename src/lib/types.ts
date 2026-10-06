// Plain, serializable shapes passed from Server Components to Client Components.
import type { Achievement, AchievementKey } from "./achievements";
import type { DateKey } from "./dates";
import type { Difficulty, Palette } from "./game";
import type { HabitStats } from "./streaks";

export type HabitDTO = {
  id: string;
  name: string;
  emoji: string;
  type: "check" | "count";
  target: number;
  unit: string;
  days: number[];
  difficulty: Difficulty;
  palette: Palette;
  startDate: DateKey;
  archived: boolean;
};

export type HabitWithData = HabitDTO & {
  stats: HabitStats;
  /** date → logged value (1 for a done check habit) */
  values: Record<DateKey, number>;
};

export type TodoDTO = {
  id: string;
  title: string;
  notes: string;
  dueDate: DateKey | null;
  difficulty: Difficulty;
  done: boolean;
  doneDate: DateKey | null;
};

export type RewardDTO = {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  redeemedCount: number;
};

export type ActivityDTO = {
  id: string;
  kind: "habit" | "todo" | "perfect_day" | "achievement" | "reward";
  label: string;
  icon: string;
  xp: number;
  coins: number;
  date: DateKey;
  createdAt: string;
};

export type ViewerDTO = {
  id: string;
  name: string;
  email: string;
  xp: number;
  coins: number;
  weekStart: number;
  timezone: string;
  achievements: { key: AchievementKey; unlockedAt: string }[];
};

export type HabitInput = {
  name: string;
  emoji: string;
  type: "check" | "count";
  target: number;
  unit: string;
  days: number[];
  difficulty: Difficulty;
  palette: Palette;
};

export type TodoInput = {
  title: string;
  notes?: string;
  dueDate: DateKey | null;
  difficulty: Difficulty;
};

export type RewardInput = { name: string; emoji: string; cost: number };

export type GameResult = {
  ok: true;
  xp: number;
  coins: number;
  levelBefore: number;
  levelAfter: number;
  achievements: Achievement[];
  perfectDay: "gained" | "lost" | null;
  streak?: number;
  multiplier?: number;
};

export type ActionError = { ok: false; error: string };
