"use server";

import { Types } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser, userToday } from "@/lib/dal";
import { isDateKey } from "@/lib/dates";
import { settleTodo, type ActionError, type GameResult } from "@/lib/engine";
import { DIFFICULTY_KEYS, levelFromXp } from "@/lib/game";
import { Todo, type ITodo } from "@/lib/models";
import type { TodoInput } from "@/lib/types";

const todoSchema = z.object({
  title: z.string().trim().min(1, "Write something to do").max(200),
  notes: z.string().trim().max(2000).optional().default(""),
  dueDate: z
    .string()
    .nullable()
    .refine((d) => d === null || isDateKey(d), "Invalid due date"),
  difficulty: z.enum(DIFFICULTY_KEYS),
});

async function ownedTodo(userId: Types.ObjectId, id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return Todo.findOne({ _id: id, userId }).lean<ITodo>();
}

export async function createTodo(input: TodoInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = todoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await Todo.create({ ...parsed.data, userId: user._id });
  refresh();
  return { ok: true };
}

export async function updateTodo(id: string, input: TodoInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = todoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const res = await Todo.updateOne({ _id: id, userId: user._id }, { $set: parsed.data });
  if (!res.matchedCount) return { ok: false, error: "Todo not found" };
  refresh();
  return { ok: true };
}

export async function toggleTodo(id: string, done: boolean): Promise<GameResult | ActionError> {
  const user = await requireUser();
  const todo = await ownedTodo(user._id, id);
  if (!todo) return { ok: false, error: "Todo not found" };
  const today = userToday(user);

  // Only flip from the opposite state so a double tap can't settle twice.
  const flipped = await Todo.updateOne(
    { _id: todo._id, done: !done },
    { $set: done ? { done, doneDate: today, doneAt: new Date() } : { done, doneDate: null, doneAt: null } },
  );
  if (!flipped.modifiedCount) {
    const level = levelFromXp(user.xp);
    return { ok: true, xp: 0, coins: 0, levelBefore: level, levelAfter: level, achievements: [], perfectDay: null };
  }
  const result = await settleTodo(user, todo, done, today);
  refresh();
  return result;
}

/** Deleting keeps any XP and the contribution you earned by completing it. */
export async function deleteTodo(id: string): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  await Todo.deleteOne({ _id: id, userId: user._id });
  refresh();
  return { ok: true };
}

export async function clearCompletedTodos(): Promise<{ ok: true }> {
  const user = await requireUser();
  await Todo.deleteMany({ userId: user._id, done: true });
  refresh();
  return { ok: true };
}
