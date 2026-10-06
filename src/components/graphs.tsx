"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { addDays, dayOfWeek, formatGithubDay, startOfWeek, type DateKey } from "@/lib/dates";
import type { HabitDTO } from "@/lib/types";
import { ContributionGraph, countLevel, ratioLevel, type CellInfo } from "./contribution-graph";
import { Box } from "./ui";
import { cn } from "@/lib/cn";

export function lastYearRange(today: DateKey, weekStart: number) {
  return { start: startOfWeek(addDays(today, -364), weekStart), end: today };
}

export function yearRange(year: number, today: DateKey) {
  const end = `${year}-12-31`;
  return { start: `${year}-01-01`, end: end < today ? end : today };
}

export function YearPicker({ years, value, onChange }: { years: number[]; value: number | null; onChange: (y: number | null) => void }) {
  if (years.length < 1) return null;
  const options: (number | null)[] = [null, ...years];
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {options.map((y) => (
        <button
          key={y ?? "last"}
          type="button"
          onClick={() => onChange(y)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
            value === y ? "bg-accent text-white" : "text-muted hover:bg-subtle hover:text-fg",
          )}
        >
          {y ?? "Last year"}
        </button>
      ))}
    </div>
  );
}

/** All habits + todos combined, exactly like GitHub's profile graph. */
export function OverallGraph({
  counts,
  today,
  weekStart,
  years = [],
  footer,
  frozen = [],
}: {
  counts: Record<DateKey, number>;
  today: DateKey;
  weekStart: number;
  years?: number[];
  footer?: ReactNode;
  frozen?: DateKey[];
}) {
  const [year, setYear] = useState<number | null>(null);
  const { start, end } = year === null ? lastYearRange(today, weekStart) : yearRange(year, today);
  const frozenSet = useMemo(() => new Set(frozen), [frozen]);

  const { total, max } = useMemo(() => {
    let total = 0;
    let max = 0;
    for (const [date, n] of Object.entries(counts)) {
      if (date < start || date > end) continue;
      total += n;
      max = Math.max(max, n);
    }
    return { total, max };
  }, [counts, start, end]);

  const getCell = useCallback(
    (date: DateKey): CellInfo => {
      const n = counts[date] ?? 0;
      const day = formatGithubDay(date);
      const isFrozen = frozenSet.has(date);
      return {
        level: countLevel(n, max),
        frozen: isFrozen && !n,
        label:
          (n ? `${n} contribution${n === 1 ? "" : "s"} on ${day}.` : `No contributions on ${day}.`) +
          (isFrozen ? " ❄️ Streak freeze used." : ""),
      };
    },
    [counts, max, frozenSet],
  );

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-normal text-fg">
          {total.toLocaleString("en-US")} contribution{total === 1 ? "" : "s"} in {year ?? "the last year"}
        </h2>
        {years.length > 1 && <YearPicker years={years} value={year} onChange={setYear} />}
      </div>
      <Box className="p-3 sm:p-4">
        <ContributionGraph
          start={start}
          end={end}
          weekStart={weekStart}
          getCell={getCell}
          footer={footer ?? "Every completed habit or todo is one contribution."}
          frozenLegend={hasFrozenIn(frozen, start, end)}
        />
      </Box>
    </section>
  );
}

type HabitGraphHabit = Pick<HabitDTO, "type" | "target" | "unit" | "days" | "startDate" | "palette">;

function hasFrozenIn(frozen: DateKey[], start: DateKey, end: DateKey) {
  return frozen.some((d) => d >= start && d <= end);
}

export function habitCell(
  habit: HabitGraphHabit,
  values: Record<DateKey, number>,
  today: DateKey,
  frozen: ReadonlySet<DateKey> = new Set(),
) {
  return (date: DateKey): CellInfo => {
    const v = values[date] ?? 0;
    const scheduled = habit.days.includes(dayOfWeek(date));
    const day = formatGithubDay(date);
    if (!v && scheduled && frozen.has(date) && date >= habit.startDate) {
      return { level: 0, frozen: true, label: `❄️ Streak freeze used · ${day}` };
    }
    let label: string;
    if (habit.type === "count") {
      label = `${v}/${habit.target}${habit.unit ? ` ${habit.unit}` : ""} on ${day}${v >= habit.target ? " ✓" : ""}`;
    } else if (v) {
      label = `Done on ${day}`;
    } else if (date === today) {
      label = "Not done yet today";
    } else if (date < habit.startDate) {
      label = `Before you started · ${day}`;
    } else {
      label = scheduled ? `Missed on ${day}` : `Rest day · ${day}`;
    }
    return {
      level: ratioLevel(v, habit.target),
      label,
      muted: !v && (!scheduled || date < habit.startDate),
    };
  };
}

export function habitLegend(habit: HabitGraphHabit) {
  return habit.type === "check"
    ? { less: "Missed", more: "Done", levels: [0, 4] as CellInfo["level"][] }
    : { less: "0", more: `${habit.target}${habit.unit ? ` ${habit.unit}` : ""}`, levels: [0, 1, 2, 3, 4] as CellInfo["level"][] };
}

export function HabitGraph({
  habit,
  values,
  today,
  weekStart,
  start,
  end,
  selected,
  onSelect,
  footer,
  frozen = [],
}: {
  frozen?: DateKey[];
  habit: HabitGraphHabit;
  values: Record<DateKey, number>;
  today: DateKey;
  weekStart: number;
  start?: DateKey;
  end?: DateKey;
  selected?: DateKey | null;
  onSelect?: (date: DateKey) => void;
  footer?: ReactNode;
}) {
  const range = lastYearRange(today, weekStart);
  const getCell = useMemo(() => habitCell(habit, values, today, new Set(frozen)), [habit, values, today, frozen]);
  return (
    <ContributionGraph
      frozenLegend={hasFrozenIn(frozen, start ?? range.start, end ?? range.end)}
      start={start ?? range.start}
      end={end ?? range.end}
      weekStart={weekStart}
      palette={habit.palette}
      getCell={getCell}
      selected={selected}
      onSelect={onSelect}
      legend={habitLegend(habit)}
      footer={footer}
    />
  );
}

export function countDoneInRange(habit: Pick<HabitDTO, "target">, values: Record<DateKey, number>, start: DateKey, end: DateKey) {
  let n = 0;
  for (const [date, v] of Object.entries(values)) if (date >= start && date <= end && v >= habit.target) n++;
  return n;
}

