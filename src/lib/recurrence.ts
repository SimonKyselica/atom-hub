import { addDays, dayOfWeek, parseKey, toKey, type DateKey } from "./dates";

export const RECURRENCES = ["daily", "weekdays", "weekly", "monthly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
};

function advance(key: DateKey, rule: Recurrence): DateKey {
  switch (rule) {
    case "daily":
      return addDays(key, 1);
    case "weekdays": {
      let d = addDays(key, 1);
      while (dayOfWeek(d) === 0 || dayOfWeek(d) === 6) d = addDays(d, 1);
      return d;
    }
    case "weekly":
      return addDays(key, 7);
    case "monthly": {
      const d = parseKey(key);
      const day = d.getUTCDate();
      const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      target.setUTCDate(Math.min(day, lastDay)); // Jan 31 → Feb 28
      return toKey(target);
    }
  }
}

/** Next due date after completing an occurrence — always in the future, so overdue repeats don't pile up. */
export function nextOccurrence(due: DateKey | null, rule: Recurrence, today: DateKey): DateKey {
  let next = advance(due ?? today, rule);
  while (next <= today) next = advance(next, rule);
  return next;
}
