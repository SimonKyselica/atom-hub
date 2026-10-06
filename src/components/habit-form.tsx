"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createHabit, updateHabit } from "@/actions/habits";
import { celebrate, run } from "@/lib/feedback";
import {
  ALL_DAYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  PALETTES,
  PALETTE_SWATCH,
  WEEKDAYS_SHORT,
  type Difficulty,
} from "@/lib/game";
import type { HabitDTO, HabitInput } from "@/lib/types";
import { Button, Dialog, EmojiPicker, Field, Input, Segmented } from "./ui";
import { cn } from "@/lib/cn";

const EMPTY: HabitInput = {
  name: "",
  emoji: "✅",
  type: "check",
  target: 1,
  unit: "",
  days: ALL_DAYS,
  difficulty: "medium",
  palette: "green",
  reminderTime: null,
};

export const HABIT_SUGGESTIONS: HabitInput[] = [
  { ...EMPTY, name: "Drink water", emoji: "💧", type: "count", target: 8, unit: "glasses", difficulty: "easy", palette: "blue" },
  { ...EMPTY, name: "Read", emoji: "📚", type: "count", target: 20, unit: "pages", palette: "purple" },
  { ...EMPTY, name: "Work out", emoji: "💪", difficulty: "hard", days: [1, 3, 5], palette: "orange" },
  { ...EMPTY, name: "Meditate", emoji: "🧘", difficulty: "easy" },
  { ...EMPTY, name: "Journal", emoji: "✍️", difficulty: "easy", palette: "pink" },
  { ...EMPTY, name: "Walk 8k steps", emoji: "🚶", difficulty: "medium" },
];

function toInput(h: HabitDTO): HabitInput {
  return {
    name: h.name,
    emoji: h.emoji,
    type: h.type,
    target: h.target,
    unit: h.unit,
    days: h.days,
    difficulty: h.difficulty,
    palette: h.palette,
    reminderTime: h.reminderTime,
  };
}

export function HabitFormDialog({
  open,
  onClose,
  habit,
  weekStart = 0,
}: {
  open: boolean;
  onClose: () => void;
  habit?: HabitDTO;
  weekStart?: number;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={habit ? "Edit habit" : "New habit"}>
      {/* Remount on open so the form always starts from the habit's current values. */}
      {open && <HabitForm habit={habit} weekStart={weekStart} onDone={onClose} />}
    </Dialog>
  );
}

function HabitForm({ habit, weekStart, onDone }: { habit?: HabitDTO; weekStart: number; onDone: () => void }) {
  const [form, setForm] = useState<HabitInput>(habit ? toInput(habit) : EMPTY);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof HabitInput>(key: K, value: HabitInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const orderedDays = [...ALL_DAYS.slice(weekStart), ...ALL_DAYS.slice(0, weekStart)];
  const toggleDay = (d: number) =>
    set("days", form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d]);
  const reward = DIFFICULTIES[form.difficulty];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (habit) {
        const res = await run(updateHabit(habit.id, form));
        if (res) {
          toast.success("Habit updated");
          onDone();
        }
      } else {
        const res = await run(createHabit(form));
        if (res) {
          toast.success(`${form.emoji} ${form.name} added — go build that streak!`);
          celebrate({ ok: true, xp: 0, coins: 0, levelBefore: 0, levelAfter: 0, achievements: res.achievements, perfectDay: null }, { quiet: true });
          onDone();
        }
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Name">
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Read 20 pages"
          maxLength={80}
          required
          autoFocus={!habit}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Icon</span>
        <EmojiPicker value={form.emoji} onChange={(v) => set("emoji", v)} />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Type</span>
        <Segmented
          className="w-full"
          value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v, target: v === "check" ? 1 : Math.max(f.target, 2) }))}
          options={[
            { value: "check", label: "Yes / no" },
            { value: "count", label: "Counted" },
          ]}
        />
        {form.type === "count" && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Daily target">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                value={form.target}
                onChange={(e) => set("target", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Unit">
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="glasses" maxLength={24} />
            </Field>
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold">Repeat on</span>
          <div className="flex gap-1">
            {[
              { label: "Daily", days: ALL_DAYS },
              { label: "Weekdays", days: [1, 2, 3, 4, 5] },
            ].map((p) => (
              <Button key={p.label} size="sm" variant="invisible" onClick={() => set("days", p.days)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {orderedDays.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={form.days.includes(d)}
              onClick={() => toggleDay(d)}
              className={cn(
                "h-9 rounded-md border text-xs font-semibold transition-colors",
                form.days.includes(d)
                  ? "border-success/50 bg-success-muted text-success"
                  : "border-line bg-subtle text-muted hover:text-fg",
              )}
            >
              {WEEKDAYS_SHORT[d]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Difficulty</span>
        <Segmented<Difficulty>
          className="w-full"
          value={form.difficulty}
          onChange={(v) => set("difficulty", v)}
          options={DIFFICULTY_KEYS.map((k) => ({ value: k, label: DIFFICULTIES[k].label }))}
        />
        <p className="mt-1.5 text-xs text-muted">
          Each completion earns <b className="text-done">+{reward.xp} XP</b> and{" "}
          <b className="text-coin">+{reward.coins} coins</b> — up to 50% more on long streaks.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Reminder</span>
        <div className="flex items-center gap-2">
          <Input
            type="time"
            className="w-36"
            value={form.reminderTime ?? ""}
            onChange={(e) => set("reminderTime", e.target.value || null)}
            aria-label="Reminder time"
          />
          {form.reminderTime ? (
            <Button size="sm" variant="invisible" onClick={() => set("reminderTime", null)}>
              No reminder
            </Button>
          ) : (
            <span className="text-xs text-muted">Optional</span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          A push notification on scheduled days if it isn&apos;t done yet. Enable notifications in Profile.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Graph color</span>
        <div className="flex gap-2">
          {PALETTES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("palette", p)}
              aria-label={p}
              aria-pressed={form.palette === p}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform",
                form.palette === p ? "scale-110 border-fg" : "border-transparent",
              )}
              style={{ background: PALETTE_SWATCH[p] }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending || !form.name.trim() || !form.days.length}>
          {pending ? "Saving…" : habit ? "Save changes" : "Create habit"}
        </Button>
      </div>
    </form>
  );
}
