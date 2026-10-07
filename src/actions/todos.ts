"use server";

import { Types } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser, userToday } from "@/lib/dal";
import { isDateKey } from "@/lib/dates";
import { settleTodo, type ActionError, type GameResult } from "@/lib/engine";
import { DIFFICULTY_KEYS, levelFromXp } from "@/lib/game";
import { Todo, type ITodo } from "@/lib/models";
import { RECURRENCES, nextOccurrence } from "@/lib/recurrence";
import type { TodoInput } from "@/lib/types";

const todoSchema = z.object({
  title: z.string().trim().min(1, "Write something to do").max(200),
  notes: z.string().trim().max(2000).optional().default(""),
  dueDate: z
    .string()
    .nullable()
    .refine((d) => d === null || isDateKey(d), "Invalid due date"),
  difficulty: z.enum(DIFFICULTY_KEYS),
  recurrence: z.enum(RECURRENCES).nullable().optional().default(null),
  subtasks: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1).max(200),
        done: z.boolean(),
      }),
    )
    .max(50, "Up to 50 subtasks")
    .optional(),
});

function toDoc(data: z.infer<typeof todoSchema>, today: string) {
  const { subtasks, ...rest } = data;
  return {
    ...rest,
    // A repeating todo needs an anchor date.
    dueDate: rest.recurrence && !rest.dueDate ? today : rest.dueDate,
    ...(subtasks && {
      subtasks: subtasks.map((s) => ({
        ...(s.id && Types.ObjectId.isValid(s.id) && { _id: new Types.ObjectId(s.id) }),
        title: s.title,
        done: s.done,
      })),
    }),
  };
}

async function ownedTodo(userId: Types.ObjectId, id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return Todo.findOne({ _id: id, userId }).lean<ITodo>();
}

export async function createTodo(input: TodoInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = todoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await Todo.create({ ...toDoc(parsed.data, userToday(user)), userId: user._id });
  refresh();
  return { ok: true };
}

export async function updateTodo(id: string, input: TodoInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = todoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Todo not found" };
  const res = await Todo.updateOne({ _id: id, userId: user._id }, { $set: toDoc(parsed.data, userToday(user)) });
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

  if (todo.recurrence) {
    if (done) {
      // Queue the next occurrence with a fresh checklist.
      const next = await Todo.create({
        userId: user._id,
        title: todo.title,
        notes: todo.notes,
        difficulty: todo.difficulty,
        recurrence: todo.recurrence,
        dueDate: nextOccurrence(todo.dueDate, todo.recurrence, today),
        subtasks: (todo.subtasks ?? []).map((s) => ({ title: s.title, done: false })),
      });
      await Todo.updateOne({ _id: todo._id }, { $set: { spawnedId: next._id } });
    } else if (todo.spawnedId) {
      // Reopened: withdraw the occurrence we queued, unless it was already completed.
      await Todo.deleteOne({ _id: todo.spawnedId, userId: user._id, done: false });
      await Todo.updateOne({ _id: todo._id }, { $set: { spawnedId: null } });
    }
  }

  const result = await settleTodo(user, todo, done, today);
  refresh();
  return result;
}

export async function toggleSubtask(todoId: string, subtaskId: string, done: boolean): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  if (!Types.ObjectId.isValid(todoId) || !Types.ObjectId.isValid(subtaskId)) return { ok: false, error: "Not found" };
  const res = await Todo.updateOne(
    { _id: todoId, userId: user._id, "subtasks._id": subtaskId },
    { $set: { "subtasks.$.done": done } },
  );
  if (!res.matchedCount) return { ok: false, error: "Subtask not found" };
  refresh();
  return { ok: true };
}

/** Deleting keeps any XP and the contribution you earned by completing it. */
export async function deleteTodo(id: string): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  if (Types.ObjectId.isValid(id)) await Todo.deleteOne({ _id: id, userId: user._id });
  refresh();
  return { ok: true };
}

export async function clearCompletedTodos(): Promise<{ ok: true }> {
  const user = await requireUser();
  await Todo.deleteMany({ userId: user._id, done: true });
  refresh();
  return { ok: true };
}
