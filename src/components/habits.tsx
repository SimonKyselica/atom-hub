"use client";

import { Archive, ArchiveRestore, ChevronLeft, Flame, Pencil, Percent, Plus, Trash2, Trophy, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteHabit, setHabitArchived } from "@/actions/habits";
import { formatKey, parseKey, type DateKey } from "@/lib/dates";
import { run } from "@/lib/feedback";
import { DIFFICULTIES, describeSchedule } from "@/lib/game";
import type { HabitWithData } from "@/lib/types";
import { HabitFormDialog } from "./habit-form";
import { HabitGraph, YearPicker, countDoneInRange, lastYearRange, yearRange } from "./graphs";
import { HabitCheckIn } from "./today-habits";
import { Box, Button, Chip } from "./ui";
import { cn } from "@/lib/cn";

function HabitChips({ habit, weekStart }: { habit: HabitWithData; weekStart: number }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      <Chip>{describeSchedule(habit.days, weekStart)}</Chip>
      {habit.type === "count" && (
        <Chip>
          {habit.target} {habit.unit || "per day"}
        </Chip>
      )}
      <Chip>
        {DIFFICULTIES[habit.difficulty].label} · <span className="text-done">+{DIFFICULTIES[habit.difficulty].xp} XP</span>
      </Chip>
    </div>
  );
}

export function HabitStatsRow({ habit, className }: { habit: HabitWithData; className?: string }) {
  const s = habit.stats;
  const items = [
    { icon: Flame, label: "Current streak", value: `${s.current} day${s.current === 1 ? "" : "s"}`, tone: s.current ? "text-attention" : "" },
    { icon: Trophy, label: "Longest streak", value: `${s.longest} day${s.longest === 1 ? "" : "s"}`, tone: "" },
    { icon: Check, label: "Total done", value: s.total.toLocaleString("en-US"), tone: "" },
    { icon: Percent, label: "Completion", value: s.rate === null ? "—" : `${s.rate}%`, tone: "" },
  ];
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4", className)}>
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className="bg-canvas px-3 py-2">
          <dt className="flex items-center gap-1 text-xs text-muted">
            <Icon size={12} /> {label}
          </dt>
          <dd className={cn("text-base font-semibold tabular-nums", tone)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HabitCard({
  habit,
  today,
  weekStart,
  onEdit,
}: {
  habit: HabitWithData;
  today: DateKey;
  weekStart: number;
  onEdit: () => void;
}) {
  const range = lastYearRange(today, weekStart);
  const done = countDoneInRange(habit, habit.values, range.start, range.end);
  return (
    <Box className="p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/habits/${habit.id}`} className="font-semibold text-accent hover:underline">
            {habit.name}
          </Link>
          <HabitChips habit={habit} weekStart={weekStart} />
        </div>
        <div className="flex items-center gap-2">
          {habit.stats.current > 0 && (
            <span className="text-sm font-semibold text-attention" title="Current streak">
              🔥 {habit.stats.current}
            </span>
          )}
          <Button variant="invisible" size="sm" className="h-8 w-8 px-0" onClick={onEdit} aria-label={`Edit ${habit.name}`}>
            <Pencil size={14} />
          </Button>
        </div>
      </div>
      <div className="mt-3">
        <HabitGraph
          habit={habit}
          values={habit.values}
          today={today}
          weekStart={weekStart}
          footer={`${done} day${done === 1 ? "" : "s"} completed in the last year`}
        />
      </div>
    </Box>
  );
}

export function HabitList({
  habits,
  archived,
  today,
  weekStart,
}: {
  habits: HabitWithData[];
  archived: HabitWithData[];
  today: DateKey;
  weekStart: number;
}) {
  const [editing, setEditing] = useState<HabitWithData | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Habits</h1>
          <p className="text-sm text-muted">Your streaks, one green square at a time.</p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <Box className="px-6 py-10 text-center">
          <p className="text-3xl">🌱</p>
          <p className="mt-2 font-semibold">No habits yet</p>
          <p className="mt-1 text-sm text-muted">Create one to start filling your graph.</p>
        </Box>
      ) : (
        <div className="space-y-4">
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} today={today} weekStart={weekStart} onEdit={() => setEditing(h)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <details className="group mt-8">
          <summary className="cursor-pointer list-none text-sm font-semibold text-muted select-none hover:text-fg">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> Archived ({archived.length})
          </summary>
          <Box className="mt-2">
            <ul className="divide-y divide-line">
              {archived.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-xl">{h.emoji}</span>
                  <Link href={`/habits/${h.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                    {h.name}
                  </Link>
                  <span className="text-xs text-muted">{h.stats.total} done</span>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => startTransition(async () => void (await run(setHabitArchived(h.id, false))))}
                  >
                    <ArchiveRestore size={14} /> Restore
                  </Button>
                </li>
              ))}
            </ul>
          </Box>
        </details>
      )}

      <HabitFormDialog
        open={creating || !!editing}
        onClose={() => (setCreating(false), setEditing(null))}
        habit={editing ?? undefined}
        weekStart={weekStart}
      />
    </>
  );
}

export function HabitDetail({ habit, today, weekStart }: { habit: HabitWithData; today: DateKey; weekStart: number }) {
  const router = useRouter();
  const [year, setYear] = useState<number | null>(null);
  const [selected, setSelected] = useState<DateKey>(today);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [values, setValue] = useOptimistic(habit.values, (state, { date, value }: { date: DateKey; value: number }) => ({
    ...state,
    [date]: value,
  }));

  const range = year === null ? lastYearRange(today, weekStart) : yearRange(year, today);
  const done = countDoneInRange(habit, values, range.start, range.end);
  const firstYear = parseKey(
    Object.keys(values).reduce((min, d) => (d < min ? d : min), habit.startDate),
  ).getUTCFullYear();
  const currentYear = parseKey(today).getUTCFullYear();
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i);

  function archive() {
    startTransition(async () => {
      const res = await run(setHabitArchived(habit.id, !habit.archived));
      if (res) toast(habit.archived ? "Habit restored" : "Habit archived — history kept", { icon: "📦" });
    });
  }

  function remove() {
    if (!confirm(`Delete “${habit.name}” and its daily log? XP and coins you earned are kept.`)) return;
    startTransition(async () => {
      const res = await run(deleteHabit(habit.id));
      if (res) {
        toast("Habit deleted", { icon: "🗑️" });
        router.push("/habits");
      }
    });
  }

  return (
    <div className={cn("space-y-6", `pal-${habit.palette}`)}>
      <div>
        <Link href="/habits" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
          <ChevronLeft size={16} /> Habits
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="text-4xl leading-none">{habit.emoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold break-words">
                {habit.name}
                {habit.archived && <Chip className="ml-2 align-middle">Archived</Chip>}
              </h1>
              <HabitChips habit={habit} weekStart={weekStart} />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button onClick={archive} disabled={pending}>
              {habit.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {habit.archived ? "Restore" : "Archive"}
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending} aria-label="Delete habit">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      <HabitStatsRow habit={habit} />

      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base">
            {done} day{done === 1 ? "" : "s"} completed in {year ?? "the last year"}
          </h2>
          {years.length > 1 && <YearPicker years={years} value={year} onChange={setYear} />}
        </div>
        <Box className="p-3 sm:p-4">
          <HabitGraph
            habit={habit}
            values={values}
            today={today}
            weekStart={weekStart}
            start={range.start}
            end={range.end}
            selected={selected}
            onSelect={setSelected}
            footer="Tap a square to edit that day."
          />
        </Box>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">
          {selected === today ? "Today" : formatKey(selected, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </h2>
        <Box>
          <ul>
            <HabitCheckIn
              key={selected}
              habit={habit}
              value={values[selected] ?? 0}
              date={selected}
              showStreak={selected === today}
              compact={selected !== today}
              onOptimistic={(value) => setValue({ date: selected, value })}
            />
          </ul>
        </Box>
        {selected !== today && (
          <p className="mt-2 text-xs text-muted">
            Forgot to log? Backfilled days count toward streaks and earn XP like any other day.
          </p>
        )}
      </section>

      <HabitFormDialog open={editing} onClose={() => setEditing(false)} habit={habit} weekStart={weekStart} />
    </div>
  );
}
