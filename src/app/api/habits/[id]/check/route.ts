import { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { getCurrentUser, userToday } from "@/lib/dal";
import { isDateKey } from "@/lib/dates";
import { applyHabitValue } from "@/lib/engine";
import { Habit, type IHabit } from "@/lib/models";

/** Used by the "✓ Mark done" button on reminder notifications (called from the service worker). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/habits/[id]/check">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Signed out" }, { status: 401 });

  const { id } = await ctx.params;
  const habit = Types.ObjectId.isValid(id) ? await Habit.findOne({ _id: id, userId: user._id }).lean<IHabit>() : null;
  if (!habit) return Response.json({ error: "Habit not found" }, { status: 404 });

  const today = userToday(user);
  const body = (await request.json().catch(() => ({}))) as { date?: unknown };
  const date = isDateKey(body.date) && body.date <= today ? body.date : today;
  const result = await applyHabitValue(user, habit, date, habit.target, today);
  return Response.json({ ok: true, xp: result.xp, coins: result.coins });
}
