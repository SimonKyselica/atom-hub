// Plain, serializable shapes passed from Server Components to Client Components.
import type { Achievement, AchievementKey } from "./achievements";
import type { DateKey } from "./dates";
import type { Difficulty, Palette } from "./game";
import type { Recurrence } from "./recurrence";
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
  reminderTime: string | null;
  archived: boolean;
};

export type HabitWithData = HabitDTO & {
  stats: HabitStats;
  /** date → logged value (1 for a done check habit) */
  values: Record<DateKey, number>;
};

export type SubtaskDTO = { id: string; title: string; done: boolean };

export type TodoDTO = {
  id: string;
  title: string;
  notes: string;
  dueDate: DateKey | null;
  difficulty: Difficulty;
  done: boolean;
  doneDate: DateKey | null;
  recurrence: Recurrence | null;
  subtasks: SubtaskDTO[];
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
  kind: "habit" | "todo" | "perfect_day" | "achievement" | "reward" | "freeze_purchase" | "freeze_used" | "quest" | "mastery";
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
  freezes: number;
  todoDigest: { enabled: boolean; time: string };
  publicSlug: string | null;
  publicEnabled: boolean;
  publicShowHabits: boolean;
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
  reminderTime: string | null;
};

export type TodoInput = {
  title: string;
  notes?: string;
  dueDate: DateKey | null;
  difficulty: Difficulty;
  recurrence?: Recurrence | null;
  /** Full list on edit; existing items keep their id. */
  subtasks?: { id?: string; title: string; done: boolean }[];
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
  /** Set when this completion pushed the habit into a new mastery tier. */
  mastery?: { habit: string; emoji: string; tier: { name: string; icon: string; coins: number } };
  freezeRefunded?: boolean;
};

export type ActionError = { ok: false; error: string };

export type QuestDTO = {
  key: string;
  icon: string;
  title: string;
  goal: number;
  progress: number;
  reward: number;
  claimed: boolean;
};
