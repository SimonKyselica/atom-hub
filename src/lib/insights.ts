import "server-only";
import type { Types } from "mongoose";
import { connectDB } from "./db";
import { addDays, dateKeyInZone, dayOfWeek, startOfWeek, type DateKey } from "./dates";
import { getFrozenDates } from "./engine";
import { Habit, HabitLog, Transaction, type IHabit, type IUser } from "./models";
import { habitStats } from "./streaks";

export type InsightsDTO = {
  kpis: {
    rate30: number | null;
    rate30Prev: number | null;
    week: number;
    weekPrev: number;
    perfect30: number;
    bestDay: { dow: number; rate: number } | null;
  };
  /** In display order (respecting week start). rate is null when nothing was scheduled. */
  weekdays: { dow: number; rate: number | null; scheduled: number }[];
  trend: { start: DateKey; rate: number | null }[];
  /** Habit check-ins per local hour (same-day logging only), last 90 days. */
  hours: number[];
  habits: { id: string; name: string; emoji: string; rate30: number | null; current: number; longest: number; total: number }[];
  hasData: boolean;
};

const pct = (done: number, scheduled: number) => (scheduled ? Math.round((done / scheduled) * 100) : null);

export async function getInsights(user: IUser, today: DateKey): Promise<InsightsDTO> {
  await connectDB();
  const userId: Types.ObjectId = user._id;
  const yesterday = addDays(today, -1);
  const since90 = addDays(today, -90);

  const [habits, frozen, txs] = await Promise.all([
    Habit.find({ userId, archived: false }).lean<IHabit[]>(),
    getFrozenDates(userId),
    Transaction.find(
      { userId, kind: { $in: ["habit", "todo", "perfect_day"] }, date: { $gte: addDays(today, -60) } },
      { kind: 1, date: 1, createdAt: 1 },
    ).lean(),
  ]);
  const logs = await HabitLog.find({ userId, habitId: { $in: habits.map((h) => h._id) }, done: true }, { habitId: 1, date: 1 }).lean();
  const done = new Map<string, Set<DateKey>>(habits.map((h) => [String(h._id), new Set()]));
  for (const l of logs) done.get(String(l.habitId))?.add(l.date);

  /** Scheduled vs completed habit-days in [from, to]; frozen days are excused. */
  function tally(from: DateKey, to: DateKey, only?: IHabit, byDow?: { scheduled: number; done: number }[]) {
    let scheduled = 0;
    let completed = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const dow = dayOfWeek(d);
      for (const h of only ? [only] : habits) {
        if (h.startDate > d || !h.days.includes(dow)) continue;
        const isDone = done.get(String(h._id))!.has(d);
        if (!isDone && frozen.has(d)) continue;
        scheduled++;
        if (isDone) completed++;
        if (byDow) {
          byDow[dow].scheduled++;
          if (isDone) byDow[dow].done++;
        }
      }
    }
    return { scheduled, completed };
  }

  const last30 = tally(addDays(today, -30), yesterday);
  const prev30 = tally(addDays(today, -60), addDays(today, -31));

  const byDow = Array.from({ length: 7 }, () => ({ scheduled: 0, done: 0 }));
  tally(addDays(today, -84), yesterday, undefined, byDow);
  const order = Array.from({ length: 7 }, (_, i) => (i + user.weekStart) % 7);
  const weekdays = order.map((dow) => ({ dow, rate: pct(byDow[dow].done, byDow[dow].scheduled), scheduled: byDow[dow].scheduled }));
  const best = weekdays.filter((w) => w.rate !== null && w.scheduled >= 3).sort((a, b) => b.rate! - a.rate!)[0];

  // Weekly trend: the last 12 weeks, the current one counted through yesterday.
  const thisWeek = startOfWeek(today, user.weekStart);
  const trend = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(thisWeek, (i - 11) * 7);
    const end = addDays(start, 6) < yesterday ? addDays(start, 6) : yesterday;
    if (end < start) return { start, rate: null };
    const t = tally(start, end);
    return { start, rate: pct(t.completed, t.scheduled) };
  }).filter((w, i, all) => !(i === all.length - 1 && w.rate === null && w.start === today));

  const contributions = txs.filter((t) => t.kind !== "perfect_day");
  const week = contributions.filter((t) => t.date > addDays(today, -7)).length;
  const weekPrev = contributions.filter((t) => t.date <= addDays(today, -7) && t.date > addDays(today, -14)).length;

  const hours = Array.from({ length: 24 }, () => 0);
  const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: user.timezone });
  const habitTx = await Transaction.find({ userId, kind: "habit", date: { $gte: since90 } }, { date: 1, createdAt: 1 }).lean();
  for (const t of habitTx) {
    const at = new Date(t.createdAt);
    if (dateKeyInZone(at, user.timezone) !== t.date) continue; // skip backfilled days
    hours[Number(hourFmt.format(at)) % 24]++;
  }

  const habitRows = habits
    .map((h) => {
      const set = done.get(String(h._id))!;
      const t = tally(addDays(today, -30), yesterday, h);
      const stats = habitStats(h, set, today, frozen);
      return {
        id: String(h._id),
        name: h.name,
        emoji: h.emoji,
        rate30: pct(t.completed, t.scheduled),
        current: stats.current,
        longest: stats.longest,
        total: stats.total,
      };
    })
    .sort((a, b) => (b.rate30 ?? -1) - (a.rate30 ?? -1));

  return {
    kpis: {
      rate30: pct(last30.completed, last30.scheduled),
      rate30Prev: pct(prev30.completed, prev30.scheduled),
      week,
      weekPrev,
      perfect30: txs.filter((t) => t.kind === "perfect_day" && t.date > addDays(today, -30)).length,
      bestDay: best ? { dow: best.dow, rate: best.rate! } : null,
    },
    weekdays,
    trend,
    hours,
    habits: habitRows,
    hasData: logs.length > 0,
  };
}
