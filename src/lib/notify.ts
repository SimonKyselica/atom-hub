import "server-only";
import { connectDB } from "./db";
import { addDays, dateKeyInZone, dayOfWeek, type DateKey } from "./dates";
import { getFrozenDates } from "./engine";
import { Habit, HabitLog, NotificationLog, PushSubscription, Todo, User, type IHabit, type ITodo } from "./models";
import { sendToUser } from "./push";
import { streakAt } from "./streaks";

/** Reminders fire within this many minutes after their time — late cron runs still deliver, stale ones don't. */
const WINDOW_MINUTES = 120;

function minutesInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isDue(time: string | null | undefined, nowMinutes: number) {
  if (!time) return false;
  const diff = nowMinutes - minutesOf(time);
  return diff >= 0 && diff < WINDOW_MINUTES;
}

/** Each reminder key is sent at most once (the log entries expire after 2 days). */
async function claim(key: string) {
  try {
    await NotificationLog.create({ key });
    return true;
  } catch {
    return false;
  }
}

async function habitBody(habit: IHabit, today: DateKey, value: number) {
  if (habit.type === "count") return `${value}/${habit.target}${habit.unit ? ` ${habit.unit}` : ""} so far — you've got this.`;
  const [done, frozen] = await Promise.all([
    HabitLog.find({ habitId: habit._id, done: true }, { date: 1 }).lean(),
    getFrozenDates(habit.userId),
  ]);
  const streak = streakAt(habit, new Set(done.map((l) => l.date)), addDays(today, -1), false, frozen);
  return streak > 0 ? `Keep your ${streak}-day streak alive 🔥` : "A great day to start a streak.";
}

/** Called by the cron endpoint. Safe to run as often as every minute. */
export async function runReminders(now = new Date()) {
  await connectDB();
  const userIds = await PushSubscription.distinct("userId");
  const users = await User.find({ _id: { $in: userIds } }, { timezone: 1, todoDigest: 1 }).lean();
  const stats = { users: users.length, habitReminders: 0, digests: 0 };

  for (const user of users) {
    const tz = user.timezone || "UTC";
    const today = dateKeyInZone(now, tz);
    const nowMin = minutesInZone(now, tz);

    // Per-habit reminders, only for habits scheduled today and not yet done.
    const habits = await Habit.find({
      userId: user._id,
      archived: false,
      reminderTime: { $ne: null },
      startDate: { $lte: today },
    }).lean<IHabit[]>();
    const due = habits.filter((h) => h.days.includes(dayOfWeek(today)) && isDue(h.reminderTime, nowMin));
    if (due.length) {
      const logs = await HabitLog.find({ habitId: { $in: due.map((h) => h._id) }, date: today }).lean();
      const byHabit = new Map(logs.map((l) => [String(l.habitId), l]));
      for (const habit of due) {
        const log = byHabit.get(String(habit._id));
        if (log?.done || !(await claim(`habit:${habit._id}:${today}`))) continue;
        stats.habitReminders += await sendToUser(user._id, {
          title: `${habit.emoji} ${habit.name}`,
          body: await habitBody(habit, today, log?.value ?? 0),
          url: `/habits/${habit._id}`,
          tag: `habit-${habit._id}`,
          actions: habit.type === "check" ? [{ action: "done", title: "✓ Mark done" }] : [],
          data: { habitId: String(habit._id), date: today, name: habit.name },
        });
      }
    }

    // Morning todo digest.
    if (user.todoDigest?.enabled && isDue(user.todoDigest.time, nowMin) && (await claim(`digest:${user._id}:${today}`))) {
      const todos = await Todo.find({ userId: user._id, done: false, dueDate: { $ne: null, $lte: today } })
        .sort({ dueDate: 1 })
        .limit(20)
        .lean<ITodo[]>();
      if (todos.length) {
        const overdue = todos.filter((t) => t.dueDate! < today).length;
        const lines = todos.slice(0, 4).map((t) => `• ${t.title}`);
        if (todos.length > 4) lines.push(`…and ${todos.length - 4} more`);
        stats.digests += await sendToUser(user._id, {
          title: `📋 ${todos.length} todo${todos.length === 1 ? "" : "s"} for today${overdue ? ` (${overdue} overdue)` : ""}`,
          body: lines.join("\n"),
          url: "/todos",
          tag: "todo-digest",
        });
      }
    }
  }
  return stats;
}
