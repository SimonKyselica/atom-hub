// Calendar dates are stored as "YYYY-MM-DD" keys in the user's local timezone.
// All arithmetic happens on UTC midnights so DST never shifts a day.

export type DateKey = string;

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !KEY_RE.test(value)) return false;
  return toKey(parseKey(value)) === value;
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = parseKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(key: DateKey): number {
  return parseKey(key).getUTCDay();
}

export function dateKeyInZone(date: Date, timeZone: string): DateKey {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return toKey(date);
  }
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Start of the week containing `key`. weekStart: 0 = Sunday, 1 = Monday. */
export function startOfWeek(key: DateKey, weekStart: number): DateKey {
  const offset = (dayOfWeek(key) - weekStart + 7) % 7;
  return addDays(key, -offset);
}

export function formatKey(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  return parseKey(key).toLocaleDateString("en-US", { timeZone: "UTC", ...options });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "October 5th" — the phrasing GitHub uses in its contribution tooltips. */
export function formatGithubDay(key: DateKey): string {
  const d = parseKey(key);
  return `${formatKey(key, { month: "long" })} ${ordinal(d.getUTCDate())}`;
}

export function formatRelativeDue(key: DateKey, today: DateKey): string {
  const diff = diffDays(key, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff} days ago`;
  if (diff < 7) return formatKey(key, { weekday: "long" });
  return formatKey(key, { month: "short", day: "numeric" });
}
