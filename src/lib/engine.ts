import "server-only";
import type { Types } from "mongoose";
import { ACHIEVEMENTS, type Achievement } from "./achievements";
import { addDays, dayOfWeek, type DateKey } from "./dates";
import { PERFECT_DAY_BONUS, habitReward, levelFromXp, todoReward, type Difficulty } from "./game";
import { Habit, HabitLog, Transaction, User, type IHabit, type ITransaction, type TransactionKind } from "./models";
import { habitStats, streakAt } from "./streaks";
import type { GameResult } from "./types";

export type { ActionError, GameResult } from "./types";

type Delta = { xp: number; coins: number };
const ZERO: Delta = { xp: 0, coins: 0 };

type Entry = {
  kind: TransactionKind;
  refId: string;
  date: DateKey;
  label: string;
  icon: string;
  xp: number;
  coins: number;
  dedupeKey: string;
};

function isDuplicateKey(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/** Record an award once. Returns what was actually applied (zero if it already existed). */
async function grant(userId: Types.ObjectId, entry: Entry): Promise<Delta> {
  await Transaction.init(); // make sure the unique dedupeKey index exists
  try {
    await Transaction.create({ userId, ...entry });
  } catch (err) {
    if (isDuplicateKey(err)) return ZERO;
    throw err;
  }
  await User.updateOne({ _id: userId }, { $inc: { xp: entry.xp, coins: entry.coins } });
  return { xp: entry.xp, coins: entry.coins };
}

/** Undo an award if it exists. Coins may go negative if they were already spent — no free rewards. */
async function revoke(userId: Types.ObjectId, dedupeKey: string): Promise<Delta> {
  const t = await Transaction.findOneAndDelete({ userId, dedupeKey }).lean<ITransaction>();
  if (!t) return ZERO;
  await User.updateOne({ _id: userId }, { $inc: { xp: -t.xp, coins: -t.coins } });
  return { xp: -t.xp, coins: -t.coins };
}

async function syncPerfectDay(userId: Types.ObjectId, date: DateKey) {
  const habits = await Habit.find({ userId, archived: false, startDate: { $lte: date } }, { days: 1 }).lean<
    Pick<IHabit, "_id" | "days">[]
  >();
  const scheduled = habits.filter((h) => h.days.includes(dayOfWeek(date)));
  let perfect = false;
  if (scheduled.length) {
    const done = await HabitLog.countDocuments({ habitId: { $in: scheduled.map((h) => h._id) }, date, done: true });
    perfect = done === scheduled.length;
  }
  const dedupeKey = `perfect:${userId}:${date}`;
  if (perfect) {
    const delta = await grant(userId, {
      kind: "perfect_day",
      refId: "",
      date,
      label: "Perfect day",
      icon: "🌟",
      ...PERFECT_DAY_BONUS,
      dedupeKey,
    });
    return { delta, status: delta.xp ? ("gained" as const) : null };
  }
  const delta = await revoke(userId, dedupeKey);
  return { delta, status: delta.xp ? ("lost" as const) : null };
}

type Hints = { date: DateKey; longestStreak?: number };

export async function checkAchievements(userId: Types.ObjectId, hints: Hints): Promise<Achievement[]> {
  const user = await User.findById(userId, { achievements: 1, xp: 1 }).lean();
  if (!user) return [];
  const have = new Set(user.achievements.map((a) => a.key));
  const pending = ACHIEVEMENTS.filter((a) => !have.has(a.key));
  if (!pending.length) return [];

  const memo = new Map<string, Promise<number>>();
  const lazy = (name: string, fn: () => Promise<number>) => {
    if (!memo.has(name)) memo.set(name, fn());
    return memo.get(name)!;
  };
  const count = (kind: TransactionKind) => lazy(kind, () => Transaction.countDocuments({ userId, kind }).exec());
  const contributions = async () => (await count("habit")) + (await count("todo"));
  const perfectRun = () =>
    lazy("perfectRun", async () => {
      const from = addDays(hints.date, -6);
      return Transaction.countDocuments({ userId, kind: "perfect_day", date: { $gte: from, $lte: hints.date } }).exec();
    });
  const level = levelFromXp(user.xp);
  const streak = hints.longestStreak ?? 0;

  const checks: Record<string, () => Promise<boolean> | boolean> = {
    first_commit: async () => (await count("habit")) >= 1,
    streak_3: () => streak >= 3,
    streak_7: () => streak >= 7,
    streak_30: () => streak >= 30,
    streak_100: () => streak >= 100,
    streak_365: () => streak >= 365,
    contrib_100: async () => (await contributions()) >= 100,
    contrib_500: async () => (await contributions()) >= 500,
    contrib_1000: async () => (await contributions()) >= 1000,
    perfect_day: async () => (await count("perfect_day")) >= 1,
    perfect_week: async () => (await perfectRun()) >= 7,
    todo_1: async () => (await count("todo")) >= 1,
    todo_50: async () => (await count("todo")) >= 50,
    todo_250: async () => (await count("todo")) >= 250,
    level_5: () => level >= 5,
    level_10: () => level >= 10,
    level_20: () => level >= 20,
    first_reward: async () => (await count("reward")) >= 1,
    habits_5: async () => (await lazy("habits", () => Habit.countDocuments({ userId }).exec())) >= 5,
  };

  const unlocked: Achievement[] = [];
  for (const a of pending) {
    if (!(await checks[a.key]?.())) continue;
    const res = await User.updateOne(
      { _id: userId, "achievements.key": { $ne: a.key } },
      { $push: { achievements: { key: a.key, unlockedAt: new Date() } } },
    );
    if (res.modifiedCount !== 1) continue;
    unlocked.push(a);
    if (a.coins) {
      await grant(userId, {
        kind: "achievement",
        refId: a.key,
        date: hints.date,
        label: a.name,
        icon: a.icon,
        xp: 0,
        coins: a.coins,
        dedupeKey: `ach:${userId}:${a.key}`,
      });
    }
  }
  return unlocked;
}

async function finish(
  userId: Types.ObjectId,
  xpBefore: number,
  delta: Delta,
  achievements: Achievement[],
  extra: Partial<GameResult> = {},
): Promise<GameResult> {
  const after = await User.findById(userId, { xp: 1 }).lean();
  const coinsFromBadges = achievements.reduce((sum, a) => sum + a.coins, 0);
  return {
    ok: true,
    xp: delta.xp,
    coins: delta.coins + coinsFromBadges,
    levelBefore: levelFromXp(xpBefore),
    levelAfter: levelFromXp(after?.xp ?? xpBefore),
    achievements,
    perfectDay: null,
    ...extra,
  };
}

/** Set a habit's value for a day and settle XP, coins, perfect day and badges. */
export async function applyHabitValue(
  user: { _id: Types.ObjectId; xp: number },
  habit: IHabit,
  date: DateKey,
  value: number,
  today: DateKey,
): Promise<GameResult> {
  const done = value >= habit.target;
  if (value > 0) {
    await HabitLog.updateOne(
      { habitId: habit._id, date },
      { $set: { userId: user._id, value, done } },
      { upsert: true },
    );
  } else {
    await HabitLog.deleteOne({ habitId: habit._id, date });
  }

  const doneDates = new Set(
    (await HabitLog.find({ habitId: habit._id, done: true }, { date: 1 }).lean()).map((l) => l.date),
  );
  const dedupeKey = `habit:${habit._id}:${date}`;

  let delta: Delta;
  let streak = 0;
  let multiplier = 1;
  if (done) {
    streak = streakAt(habit, doneDates, date);
    const reward = habitReward(habit.difficulty, streak);
    multiplier = reward.multiplier;
    delta = await grant(user._id, {
      kind: "habit",
      refId: String(habit._id),
      date,
      label: habit.name,
      icon: habit.emoji,
      xp: reward.xp,
      coins: reward.coins,
      dedupeKey,
    });
  } else {
    delta = await revoke(user._id, dedupeKey);
  }

  const perfect = await syncPerfectDay(user._id, date);
  delta = { xp: delta.xp + perfect.delta.xp, coins: delta.coins + perfect.delta.coins };

  const achievements = done
    ? await checkAchievements(user._id, { date, longestStreak: habitStats(habit, doneDates, today).longest })
    : [];

  return finish(user._id, user.xp, delta, achievements, { perfectDay: perfect.status, streak, multiplier });
}

export async function settleTodo(
  user: { _id: Types.ObjectId; xp: number },
  todo: { _id: Types.ObjectId; title: string; difficulty: Difficulty },
  done: boolean,
  today: DateKey,
): Promise<GameResult> {
  const dedupeKey = `todo:${todo._id}`;
  let delta: Delta;
  let achievements: Achievement[] = [];
  if (done) {
    const reward = todoReward(todo.difficulty);
    delta = await grant(user._id, {
      kind: "todo",
      refId: String(todo._id),
      date: today,
      label: todo.title,
      icon: "✅",
      ...reward,
      dedupeKey,
    });
    achievements = await checkAchievements(user._id, { date: today });
  } else {
    delta = await revoke(user._id, dedupeKey);
  }
  return finish(user._id, user.xp, delta, achievements);
}

export async function afterRedeem(user: { _id: Types.ObjectId; xp: number }, cost: number, today: DateKey) {
  const achievements = await checkAchievements(user._id, { date: today });
  return finish(user._id, user.xp, { xp: 0, coins: -cost }, achievements);
}
