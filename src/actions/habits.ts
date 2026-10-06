"use server";

import { Types } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import type { Achievement } from "@/lib/achievements";
import { requireUser, userToday } from "@/lib/dal";
import { isDateKey } from "@/lib/dates";
import { applyHabitValue, checkAchievements, type ActionError, type GameResult } from "@/lib/engine";
import { DIFFICULTY_KEYS, PALETTES } from "@/lib/game";
import { Habit, HabitLog, type IHabit } from "@/lib/models";
import type { HabitInput } from "@/lib/types";

const habitSchema = z
  .object({
    name: z.string().trim().min(1, "Give your habit a name").max(80, "Keep the name under 80 characters"),
    emoji: z.string().trim().min(1).max(16).catch("✅"),
    type: z.enum(["check", "count"]),
    target: z.coerce.number().int().min(1, "Target must be at least 1").max(10000),
    unit: z.string().trim().max(24).catch(""),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Pick at least one day")
      .transform((d) => [...new Set(d)].sort()),
    difficulty: z.enum(DIFFICULTY_KEYS),
    palette: z.enum(PALETTES),
  })
  .transform((h) => (h.type === "check" ? { ...h, target: 1, unit: "" } : h));

async function ownedHabit(userId: Types.ObjectId, id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return Habit.findOne({ _id: id, userId }).lean<IHabit>();
}

export async function createHabit(
  input: HabitInput,
): Promise<{ ok: true; id: string; achievements: Achievement[] } | ActionError> {
  const user = await requireUser();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const today = userToday(user);
  const order = await Habit.countDocuments({ userId: user._id });
  const habit = await Habit.create({ ...parsed.data, userId: user._id, startDate: today, order });
  const achievements = await checkAchievements(user._id, { date: today });
  refresh();
  return { ok: true, id: String(habit._id), achievements };
}

export async function updateHabit(id: string, input: HabitInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const existing = await ownedHabit(user._id, id);
  if (!existing) return { ok: false, error: "Habit not found" };

  const updated = await Habit.findOneAndUpdate(
    { _id: existing._id },
    { $set: parsed.data },
    { returnDocument: "after" },
  ).lean<IHabit>();

  // A new target changes whether today counts as done — settle it. Past days keep their result.
  if (updated && (existing.target !== updated.target || existing.type !== updated.type)) {
    const today = userToday(user);
    const log = await HabitLog.findOne({ habitId: existing._id, date: today }).lean();
    if (log) await applyHabitValue(user, updated, today, Math.min(log.value, updated.target), today);
  }
  refresh();
  return { ok: true };
}

export async function setHabitArchived(id: string, archived: boolean): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const habit = await ownedHabit(user._id, id);
  if (!habit) return { ok: false, error: "Habit not found" };
  await Habit.updateOne({ _id: habit._id }, { $set: { archived } });
  refresh();
  return { ok: true };
}

/** Removes the habit and its daily logs. XP, coins and contributions already earned stay. */
export async function deleteHabit(id: string): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const habit = await ownedHabit(user._id, id);
  if (!habit) return { ok: false, error: "Habit not found" };
  await Promise.all([Habit.deleteOne({ _id: habit._id }), HabitLog.deleteMany({ habitId: habit._id })]);
  refresh();
  return { ok: true };
}

const valueSchema = z.number().int().min(0).max(100000);

/** Log a habit for a day: 1/0 for check habits, the running count for counted habits. */
export async function setHabitValue(habitId: string, date: string, value: number): Promise<GameResult | ActionError> {
  const user = await requireUser();
  const today = userToday(user);
  if (!isDateKey(date) || date > today) return { ok: false, error: "You can't log days in the future" };
  const parsedValue = valueSchema.safeParse(value);
  if (!parsedValue.success) return { ok: false, error: "Invalid value" };
  const habit = await ownedHabit(user._id, habitId);
  if (!habit) return { ok: false, error: "Habit not found" };

  const result = await applyHabitValue(user, habit, date, parsedValue.data, today);
  refresh();
  return result;
}
