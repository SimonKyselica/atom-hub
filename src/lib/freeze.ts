import "server-only";
import { addDays, dayOfWeek, type DateKey } from "./dates";
import { checkAchievements, getFrozenDates } from "./engine";
import { Habit, HabitLog, Transaction, User, type IHabit, type IUser } from "./models";
import { streakAt } from "./streaks";

const MAX_LOOKBACK_DAYS = 30;

/**
 * Runs once per day per user (on the first request after midnight). Walks the days
 * since the last check; for each day where a scheduled habit was missed *and* that
 * habit had a streak going, spends one freeze to protect every streak that day.
 * Returns true if anything changed.
 */
export async function settleMissedDays(user: IUser, today: DateKey): Promise<boolean> {
  const yesterday = addDays(today, -1);
  if (user.settledThrough && user.settledThrough >= yesterday) return false;

  // Claim the window atomically so parallel requests don't both spend freezes.
  const claimed = await User.updateOne(
    { _id: user._id, settledThrough: user.settledThrough ?? null },
    { $set: { settledThrough: yesterday } },
  );
  if (!claimed.modifiedCount || !user.settledThrough || (user.freezes ?? 0) <= 0) return false;

  let from = addDays(user.settledThrough, 1);
  const floor = addDays(yesterday, -MAX_LOOKBACK_DAYS);
  if (from < floor) from = floor;

  const habits = await Habit.find({ userId: user._id, archived: false }).lean<IHabit[]>();
  if (!habits.length) return false;
  const logs = await HabitLog.find({ userId: user._id, done: true }, { habitId: 1, date: 1 }).lean();
  const done = new Map<string, Set<DateKey>>(habits.map((h) => [String(h._id), new Set()]));
  for (const l of logs) done.get(String(l.habitId))?.add(l.date);
  const frozen = await getFrozenDates(user._id);

  let used = 0;
  for (let d = from; d <= yesterday; d = addDays(d, 1)) {
    if (frozen.has(d)) continue;
    const missed = habits.filter(
      (h) => h.startDate <= d && h.days.includes(dayOfWeek(d)) && !done.get(String(h._id))!.has(d),
    );
    const atRisk = missed.some((h) => streakAt(h, done.get(String(h._id))!, addDays(d, -1), false, frozen) > 0);
    if (!atRisk) continue;

    const spent = await User.updateOne({ _id: user._id, freezes: { $gt: 0 } }, { $inc: { freezes: -1 } });
    if (!spent.modifiedCount) break;
    try {
      await Transaction.create({
        userId: user._id,
        kind: "freeze_used",
        refId: "",
        date: d,
        label: "Streak freeze used",
        icon: "❄️",
        xp: 0,
        coins: 0,
        dedupeKey: `freeze:${user._id}:${d}`,
      });
      frozen.add(d);
      used++;
    } catch {
      await User.updateOne({ _id: user._id }, { $inc: { freezes: 1 } }); // already frozen — give it back
    }
  }

  if (used) await checkAchievements(user._id, { date: today });
  return used > 0;
}
