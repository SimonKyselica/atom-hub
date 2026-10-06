"use client";

import { Check, Minus, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { createHabit, setHabitValue } from "@/actions/habits";
import { dayOfWeek, type DateKey } from "@/lib/dates";
import { celebrate, run } from "@/lib/feedback";
import { habitReward } from "@/lib/game";
import type { GameResult, HabitWithData } from "@/lib/types";
import { HABIT_SUGGESTIONS, HabitFormDialog } from "./habit-form";
import { Box, Button, ProgressBar } from "./ui";
import { cn } from "@/lib/cn";

type Float = { id: number; text: string; positive: boolean };

function useFloats() {
  const [floats, setFloats] = useState<Float[]>([]);
  const push = (text: string, positive: boolean) => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, text, positive }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  };
  return { floats, push };
}

export function HabitCheckIn({
  habit,
  value,
  date,
  onOptimistic,
  compact = false,
  showStreak = true,
}: {
  habit: HabitWithData;
  value: number;
  date: DateKey;
  onOptimistic: (value: number) => void;
  compact?: boolean;
  showStreak?: boolean;
}) {
  const [, startTransition] = useTransition();
  const { floats, push } = useFloats();
  const done = value >= habit.target;
  const serverDone = (habit.values[date] ?? 0) >= habit.target;
  const streak = Math.max(0, habit.stats.current + (done && !serverDone ? 1 : !done && serverDone ? -1 : 0));
  const preview = habitReward(habit.difficulty, (serverDone ? habit.stats.current : habit.stats.current + 1));

  function change(next: number) {
    next = Math.max(0, next);
    if (next === value) return;
    if ("vibrate" in navigator && next >= habit.target && value < habit.target) navigator.vibrate?.(15);
    startTransition(async () => {
      onOptimistic(next);
      const res = await run<GameResult>(setHabitValue(habit.id, date, next));
      if (!res) return;
      if (res.xp) push(`${res.xp > 0 ? "+" : "−"}${Math.abs(res.xp)} XP`, res.xp > 0);
      celebrate(res, { quiet: true });
    });
  }

  return (
    <li className={cn("flex items-center gap-3 px-3 py-3", `pal-${habit.palette}`)}>
      <span className="w-8 shrink-0 text-center text-2xl leading-none" aria-hidden>
        {habit.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/habits/${habit.id}`}
          className={cn("block truncate font-semibold hover:text-accent hover:underline", done && "text-muted")}
        >
          {habit.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-muted">
          {showStreak && streak > 0 && (
            <span className="font-semibold text-attention" title={`${streak}-day streak`}>
              🔥 {streak}
            </span>
          )}
          {habit.type === "count" && (
            <span className="tabular-nums">
              {value}/{habit.target} {habit.unit}
            </span>
          )}
          {!compact && !done && (
            <span>
              +{preview.xp} XP{preview.multiplier > 1 && <span className="text-attention"> ×{preview.multiplier.toFixed(1)}</span>}
            </span>
          )}
          {done && <span className="text-success">Done</span>}
        </div>
        {habit.type === "count" && (
          <ProgressBar
            percent={(value / habit.target) * 100}
            className="mt-1.5 h-1.5 max-w-56"
            barClassName="!bg-[var(--l3)]"
          />
        )}
      </div>

      <div className="relative flex shrink-0 items-center gap-1.5">
        {floats.map((f) => (
          <span
            key={f.id}
            className={cn(
              "xp-float pointer-events-none absolute -top-1 left-1/2 text-xs font-bold whitespace-nowrap",
              f.positive ? "text-done" : "text-muted",
            )}
          >
            {f.text}
          </span>
        ))}
        {habit.type === "check" ? (
          <button
            type="button"
            onClick={() => change(done ? 0 : 1)}
            aria-pressed={done}
            aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all active:scale-90",
              done
                ? "pop border-transparent bg-[var(--l3)] text-white"
                : "border-line text-transparent hover:border-[var(--l3)] hover:text-[var(--l3)]",
            )}
          >
            <Check size={20} strokeWidth={3} />
          </button>
        ) : (
          <>
            <Button
              variant="default"
              className="h-9 w-9 rounded-full px-0"
              onClick={() => change(value - 1)}
              disabled={value <= 0}
              aria-label={`Decrease ${habit.name}`}
            >
              <Minus size={16} />
            </Button>
            <button
              type="button"
              onClick={() => change(done ? 0 : habit.target)}
              title={done ? "Reset" : "Fill to target"}
              aria-label={done ? `Reset ${habit.name}` : `Complete ${habit.name}`}
              className={cn(
                "flex h-10 min-w-10 items-center justify-center rounded-full border-2 px-1 text-sm font-bold tabular-nums transition-all active:scale-90",
                done ? "pop border-transparent bg-[var(--l3)] text-white" : "border-line text-fg",
              )}
            >
              {done ? <Check size={20} strokeWidth={3} /> : value}
            </button>
            <Button
              variant="default"
              className="h-9 w-9 rounded-full px-0"
              onClick={() => change(value + 1)}
              aria-label={`Increase ${habit.name}`}
            >
              <Plus size={16} />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function TodayHabits({ habits, today, weekStart }: { habits: HabitWithData[]; today: DateKey; weekStart: number }) {
  const [formOpen, setFormOpen] = useState(false);
  const base = useMemo(() => Object.fromEntries(habits.map((h) => [h.id, h.values[today] ?? 0])), [habits, today]);
  const [values, setValue] = useOptimistic(base, (state, { id, value }: { id: string; value: number }) => ({
    ...state,
    [id]: value,
  }));

  const dow = dayOfWeek(today);
  const scheduled = habits.filter((h) => h.days.includes(dow));
  const rest = habits.filter((h) => !h.days.includes(dow));
  const doneCount = scheduled.filter((h) => (values[h.id] ?? 0) >= h.target).length;
  const perfect = scheduled.length > 0 && doneCount === scheduled.length;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Today&apos;s habits</h2>
        <Button size="sm" variant="primary" onClick={() => setFormOpen(true)}>
          <Plus size={14} /> New habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <EmptyHabits onCustom={() => setFormOpen(true)} />
      ) : (
        <Box>
          {scheduled.length > 0 && (
            <div className="flex items-center gap-3 border-b border-line bg-subtle px-3 py-2.5">
              <span className="text-sm font-semibold tabular-nums">
                {doneCount}/{scheduled.length}
              </span>
              <ProgressBar percent={(doneCount / scheduled.length) * 100} className="flex-1" />
              {perfect && (
                <span className="flex items-center gap-1 text-xs font-semibold text-attention">
                  <Sparkles size={14} /> Perfect day
                </span>
              )}
            </div>
          )}
          <ul className="divide-y divide-line">
            {scheduled.map((h) => (
              <HabitCheckIn
                key={h.id}
                habit={h}
                value={values[h.id] ?? 0}
                date={today}
                onOptimistic={(value) => setValue({ id: h.id, value })}
              />
            ))}
          </ul>
          {scheduled.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">Rest day — nothing scheduled today. 🌴</p>
          )}
          {rest.length > 0 && (
            <details className="group border-t border-line">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-sm text-muted select-none hover:text-fg">
                <span className="inline-block transition-transform group-open:rotate-90">›</span> Not scheduled today (
                {rest.length}) — bonus completions still count
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {rest.map((h) => (
                  <HabitCheckIn
                    key={h.id}
                    habit={h}
                    value={values[h.id] ?? 0}
                    date={today}
                    compact
                    onOptimistic={(value) => setValue({ id: h.id, value })}
                  />
                ))}
              </ul>
            </details>
          )}
        </Box>
      )}

      <HabitFormDialog open={formOpen} onClose={() => setFormOpen(false)} weekStart={weekStart} />
    </section>
  );
}

function EmptyHabits({ onCustom }: { onCustom: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <Box className="p-5 text-center">
      <p className="text-3xl">🌱</p>
      <h3 className="mt-2 font-semibold">Plant your first green square</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Pick a starter habit or create your own. Every completion turns a square green.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {HABIT_SUGGESTIONS.map((s) => (
          <Button
            key={s.name}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await run(createHabit(s));
                if (res) toast.success(`${s.emoji} ${s.name} added`);
              })
            }
          >
            {s.emoji} {s.name}
          </Button>
        ))}
        <Button variant="primary" onClick={onCustom}>
          <Plus size={14} /> Custom
        </Button>
      </div>
    </Box>
  );
}
