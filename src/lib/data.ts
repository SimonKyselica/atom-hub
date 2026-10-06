import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { addDays, startOfWeek, type DateKey } from "./dates";
import {
  Habit,
  HabitLog,
  Reward,
  Todo,
  Transaction,
  type IHabit,
  type IHabitLog,
  type IReward,
  type ITodo,
  type ITransaction,
  type IUser,
} from "./models";
import { habitStats } from "./streaks";
import type { ActivityDTO, HabitDTO, HabitWithData, RewardDTO, TodoDTO, ViewerDTO } from "./types";
import type { AchievementKey } from "./achievements";

export function toViewer(user: IUser): ViewerDTO {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    xp: user.xp,
    coins: user.coins,
    weekStart: user.weekStart ?? 0,
    timezone: user.timezone,
    achievements: (user.achievements ?? []).map((a) => ({
      key: a.key as AchievementKey,
      unlockedAt: new Date(a.unlockedAt).toISOString(),
    })),
  };
}

export function toHabitDTO(h: IHabit): HabitDTO {
  return {
    id: String(h._id),
    name: h.name,
    emoji: h.emoji,
    type: h.type,
    target: h.target,
    unit: h.unit,
    days: h.days,
    difficulty: h.difficulty,
    palette: h.palette,
    startDate: h.startDate,
    archived: h.archived,
  };
}

function toTodoDTO(t: ITodo): TodoDTO {
  return {
    id: String(t._id),
    title: t.title,
    notes: t.notes,
    dueDate: t.dueDate,
    difficulty: t.difficulty,
    done: t.done,
    doneDate: t.doneDate,
  };
}

function toRewardDTO(r: IReward): RewardDTO {
  return { id: String(r._id), name: r.name, emoji: r.emoji, cost: r.cost, redeemedCount: r.redeemedCount };
}

function toActivityDTO(t: ITransaction): ActivityDTO {
  return {
    id: String(t._id),
    kind: t.kind,
    label: t.label,
    icon: t.icon,
    xp: t.xp,
    coins: t.coins,
    date: t.date,
    createdAt: new Date(t.createdAt).toISOString(),
  };
}

/** First day of a GitHub-style "last year" graph: 52 full weeks plus the current one. */
export function graphStart(today: DateKey, weekStart: number) {
  return startOfWeek(addDays(today, -364), weekStart);
}

export async function getHabits(
  userId: Types.ObjectId,
  today: DateKey,
  { archived = false, habitId }: { archived?: boolean; habitId?: string } = {},
): Promise<HabitWithData[]> {
  await connectDB();
  const filter: Record<string, unknown> = { userId };
  if (habitId) {
    if (!Types.ObjectId.isValid(habitId)) return [];
    filter._id = new Types.ObjectId(habitId);
  } else if (!archived) {
    filter.archived = false;
  }
  const habits = await Habit.find(filter).sort({ archived: 1, order: 1, createdAt: 1 }).lean<IHabit[]>();
  if (!habits.length) return [];

  const logs = await HabitLog.find(
    { userId, habitId: { $in: habits.map((h) => h._id) } },
    { habitId: 1, date: 1, value: 1, done: 1 },
  ).lean<IHabitLog[]>();

  const byHabit = new Map<string, IHabitLog[]>();
  for (const log of logs) {
    const key = String(log.habitId);
    if (!byHabit.has(key)) byHabit.set(key, []);
    byHabit.get(key)!.push(log);
  }

  return habits.map((h) => {
    const habitLogs = byHabit.get(String(h._id)) ?? [];
    const done = new Set(habitLogs.filter((l) => l.done).map((l) => l.date));
    const values: Record<DateKey, number> = {};
    for (const l of habitLogs) values[l.date] = l.value;
    return { ...toHabitDTO(h), stats: habitStats(h, done, today), values };
  });
}

/** date → number of contributions (completed habits + todos). */
export async function getContributions(userId: Types.ObjectId, from?: DateKey): Promise<Record<DateKey, number>> {
  await connectDB();
  const match: Record<string, unknown> = { userId, kind: { $in: ["habit", "todo"] } };
  if (from) match.date = { $gte: from };
  const rows = await Transaction.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$date", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

export async function getTodos(userId: Types.ObjectId) {
  await connectDB();
  const [active, completed] = await Promise.all([
    Todo.find({ userId, done: false }).sort({ createdAt: -1 }).lean<ITodo[]>(),
    Todo.find({ userId, done: true }).sort({ doneAt: -1 }).limit(100).lean<ITodo[]>(),
  ]);
  return { active: active.map(toTodoDTO), completed: completed.map(toTodoDTO) };
}

export async function getRewards(userId: Types.ObjectId) {
  await connectDB();
  const [rewards, history] = await Promise.all([
    Reward.find({ userId }).sort({ cost: 1 }).lean<IReward[]>(),
    Transaction.find({ userId, kind: "reward" }).sort({ createdAt: -1 }).limit(20).lean<ITransaction[]>(),
  ]);
  return { rewards: rewards.map(toRewardDTO), history: history.map(toActivityDTO) };
}

export async function getActivity(userId: Types.ObjectId, limit = 30) {
  await connectDB();
  const rows = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean<ITransaction[]>();
  return rows.map(toActivityDTO);
}

export async function getProfileCounts(userId: Types.ObjectId) {
  await connectDB();
  const rows = await Transaction.aggregate<{ _id: string; count: number }>([
    { $match: { userId } },
    { $group: { _id: "$kind", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(rows.map((r) => [r._id, r.count])) as Record<string, number>;
  const habits = await Habit.countDocuments({ userId, archived: false });
  return {
    habitsDone: counts.habit ?? 0,
    todosDone: counts.todo ?? 0,
    perfectDays: counts.perfect_day ?? 0,
    rewardsRedeemed: counts.reward ?? 0,
    activeHabits: habits,
  };
}
