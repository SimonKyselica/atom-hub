import { addDays, dayOfWeek, type DateKey } from "./dates";

export type ScheduleLike = { days: number[]; startDate: DateKey };

function earliestOf(habit: ScheduleLike, done: Set<DateKey>) {
  let earliest = habit.startDate;
  for (const d of done) if (d < earliest) earliest = d;
  return earliest;
}

/**
 * Consecutive completions ending at `asOf`. Unscheduled days never break a streak
 * (and count if you did the habit anyway). With `pendingOk`, an unfinished `asOf`
 * (i.e. today, still in progress) doesn't break it either.
 */
export function streakAt(habit: ScheduleLike, done: Set<DateKey>, asOf: DateKey, pendingOk = false): number {
  const days = new Set(habit.days);
  const earliest = earliestOf(habit, done);
  let d = asOf;
  if (pendingOk && !done.has(d)) d = addDays(d, -1);
  let streak = 0;
  while (d >= earliest) {
    if (done.has(d)) streak++;
    else if (days.has(dayOfWeek(d))) break;
    d = addDays(d, -1);
  }
  return streak;
}

export type HabitStats = { current: number; longest: number; total: number; rate: number | null };

export function habitStats(habit: ScheduleLike, done: Set<DateKey>, today: DateKey): HabitStats {
  const days = new Set(habit.days);
  const earliest = earliestOf(habit, done);
  let longest = 0;
  let run = 0;
  let scheduled = 0;
  let scheduledDone = 0;
  for (let d = earliest; d <= today; d = addDays(d, 1)) {
    const isDone = done.has(d);
    const isScheduled = days.has(dayOfWeek(d));
    const isPendingToday = d === today && !isDone;
    if (isScheduled && !isPendingToday) {
      scheduled++;
      if (isDone) scheduledDone++;
    }
    if (isDone) longest = Math.max(longest, ++run);
    else if (isScheduled && !isPendingToday) run = 0;
  }
  return {
    current: streakAt(habit, done, today, true),
    longest,
    total: [...done].filter((d) => d <= today).length,
    rate: scheduled ? Math.round((scheduledDone / scheduled) * 100) : null,
  };
}

/** Consecutive calendar days present in `dates`, ending today (or yesterday if today is still empty). */
export function dayStreak(dates: Set<DateKey>, today: DateKey): number {
  let d = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export function longestDayStreak(dates: Set<DateKey>): number {
  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function isScheduledOn(habit: ScheduleLike, date: DateKey) {
  return habit.days.includes(dayOfWeek(date));
}
