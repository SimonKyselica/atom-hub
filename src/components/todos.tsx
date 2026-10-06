"use client";

import { CircleCheck, CircleDot, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { clearCompletedTodos, createTodo, deleteTodo, toggleTodo, updateTodo } from "@/actions/todos";
import { addDays, formatRelativeDue, type DateKey } from "@/lib/dates";
import { celebrate, run } from "@/lib/feedback";
import { DIFFICULTIES, DIFFICULTY_KEYS, type Difficulty } from "@/lib/game";
import type { GameResult, TodoDTO, TodoInput } from "@/lib/types";
import { Box, Button, Chip, Counter, Dialog, Field, Input, Segmented } from "./ui";
import { cn } from "@/lib/cn";

// ---------- Item ----------

export function TodoItem({ todo, today, onEdit }: { todo: TodoDTO; today: DateKey; onEdit?: (t: TodoDTO) => void }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(todo.done);
  const overdue = !done && todo.dueDate !== null && todo.dueDate < today;
  const dueToday = !done && todo.dueDate === today;

  function toggle() {
    startTransition(async () => {
      setDone(!done);
      const res = await run<GameResult>(toggleTodo(todo.id, !done));
      if (res) celebrate(res);
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await run(deleteTodo(todo.id));
      if (res) toast("Todo deleted", { icon: "🗑️" });
    });
  }

  return (
    <li className={cn("group flex items-start gap-3 px-3 py-3 transition-opacity", pending && "opacity-70")}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        aria-label={done ? `Reopen ${todo.title}` : `Complete ${todo.title}`}
        className={cn(
          "mt-0.5 shrink-0 rounded-full transition-transform active:scale-90",
          done ? "pop text-done" : overdue ? "text-danger" : "text-success",
        )}
      >
        {done ? <CircleCheck size={20} /> : <CircleDot size={20} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold break-words", done && "text-muted line-through decoration-muted/60")}>
          {todo.title}
        </p>
        {todo.notes && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{todo.notes}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {done && todo.doneDate ? (
            <span className="text-xs text-muted">Closed {formatRelativeDue(todo.doneDate, today).toLowerCase()}</span>
          ) : (
            todo.dueDate && (
              <Chip
                className={cn(
                  overdue && "border-danger/40 bg-danger-muted text-danger",
                  dueToday && "border-accent/40 bg-accent-muted text-accent",
                )}
              >
                {overdue ? "Overdue · " : "Due "}
                {formatRelativeDue(todo.dueDate, today)}
              </Chip>
            )
          )}
          {!done && (
            <Chip>
              {DIFFICULTIES[todo.difficulty].label} · <span className="text-done">+{DIFFICULTIES[todo.difficulty].xp} XP</span>
            </Chip>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {onEdit && !done && (
          <Button variant="invisible" size="sm" className="h-8 w-8 px-0" onClick={() => onEdit(todo)} aria-label="Edit">
            <Pencil size={14} />
          </Button>
        )}
        <Button variant="invisible" size="sm" className="h-8 w-8 px-0 hover:!text-danger" onClick={remove} aria-label="Delete">
          <Trash2 size={14} />
        </Button>
      </div>
    </li>
  );
}

// ---------- Add / edit ----------

function DuePicker({ value, onChange, today }: { value: DateKey | null; onChange: (d: DateKey | null) => void; today: DateKey }) {
  const tomorrow = addDays(today, 1);
  const preset = value === null ? "none" : value === today ? "today" : value === tomorrow ? "tomorrow" : "custom";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        value={preset}
        onChange={(v) => {
          if (v === "none") onChange(null);
          if (v === "today") onChange(today);
          if (v === "tomorrow") onChange(tomorrow);
          if (v === "custom") onChange(addDays(today, 7));
        }}
        options={[
          { value: "none", label: "None" },
          { value: "today", label: "Today" },
          { value: "tomorrow", label: "Tomorrow" },
          { value: "custom", label: "Date" },
        ]}
      />
      {preset === "custom" && (
        <Input
          type="date"
          className="w-auto"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          aria-label="Due date"
        />
      )}
    </div>
  );
}

function TodoForm({ todo, today, onDone }: { todo?: TodoDTO; today: DateKey; onDone: () => void }) {
  const [form, setForm] = useState<TodoInput>(
    todo
      ? { title: todo.title, notes: todo.notes, dueDate: todo.dueDate, difficulty: todo.difficulty }
      : { title: "", notes: "", dueDate: null, difficulty: "easy" },
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await run(todo ? updateTodo(todo.id, form) : createTodo(form));
          if (res) onDone();
        });
      }}
    >
      <Field label="Title">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} autoFocus />
      </Field>
      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-base focus:border-accent focus:outline-2 focus:outline-offset-[-1px] focus:outline-accent sm:text-sm"
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Due</span>
        <DuePicker value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} today={today} />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Difficulty</span>
        <Segmented<Difficulty>
          value={form.difficulty}
          onChange={(difficulty) => setForm({ ...form, difficulty })}
          options={DIFFICULTY_KEYS.map((k) => ({ value: k, label: `${DIFFICULTIES[k].label} · ${DIFFICULTIES[k].xp} XP` }))}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending || !form.title.trim()}>
          {pending ? "Saving…" : todo ? "Save" : "Add todo"}
        </Button>
      </div>
    </form>
  );
}

export function QuickAddTodo({ today, defaultDue = null }: { today: DateKey; defaultDue?: DateKey | null }) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [dueDate, setDueDate] = useState<DateKey | null>(defaultDue);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const res = await run(createTodo({ title, dueDate, difficulty }));
          if (res) {
            setTitle("");
            setExpanded(false);
            setDueDate(defaultDue);
          }
        });
      }}
    >
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Add a todo…"
          maxLength={200}
          aria-label="New todo"
        />
        <Button type="submit" variant="primary" className="h-9" disabled={pending || !title.trim()} aria-label="Add todo">
          <Plus size={16} />
        </Button>
      </div>
      {expanded && (
        <div className="flex flex-wrap gap-2">
          <DuePicker value={dueDate} onChange={setDueDate} today={today} />
          <Segmented<Difficulty>
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTY_KEYS.map((k) => ({ value: k, label: DIFFICULTIES[k].label }))}
          />
        </div>
      )}
    </form>
  );
}

// ---------- Lists ----------

function sortOpen(todos: TodoDTO[]) {
  return [...todos].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

function groupOpen(todos: TodoDTO[], today: DateKey) {
  const groups: { label: string; items: TodoDTO[] }[] = [
    { label: "Overdue", items: [] },
    { label: "Today", items: [] },
    { label: "Upcoming", items: [] },
    { label: "Someday", items: [] },
  ];
  for (const t of sortOpen(todos)) {
    if (!t.dueDate) groups[3].items.push(t);
    else if (t.dueDate < today) groups[0].items.push(t);
    else if (t.dueDate === today) groups[1].items.push(t);
    else groups[2].items.push(t);
  }
  return groups.filter((g) => g.items.length);
}

export function TodoBoard({ active, completed, today }: { active: TodoDTO[]; completed: TodoDTO[]; today: DateKey }) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [editing, setEditing] = useState<TodoDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Box className="mb-4 p-3">
        <QuickAddTodo today={today} />
      </Box>

      <Box>
        <div className="flex items-center gap-4 rounded-t-md border-b border-line bg-subtle px-3 py-2.5 text-sm">
          <button
            type="button"
            onClick={() => setTab("open")}
            className={cn("flex items-center gap-1.5", tab === "open" ? "font-semibold text-fg" : "text-muted hover:text-fg")}
          >
            <CircleDot size={16} /> {active.length} Open
          </button>
          <button
            type="button"
            onClick={() => setTab("closed")}
            className={cn("flex items-center gap-1.5", tab === "closed" ? "font-semibold text-fg" : "text-muted hover:text-fg")}
          >
            <CircleCheck size={16} /> {completed.length} Closed
          </button>
          <div className="ml-auto flex gap-1">
            {tab === "closed" && completed.length > 0 && (
              <Button
                size="sm"
                variant="invisible"
                disabled={pending}
                onClick={() => startTransition(async () => void (await run(clearCompletedTodos())))}
              >
                Clear all
              </Button>
            )}
            {tab === "open" && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} /> Detailed
              </Button>
            )}
          </div>
        </div>

        {tab === "open" ? (
          active.length ? (
            groupOpen(active, today).map((g) => (
              <div key={g.label}>
                <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs font-semibold text-muted">
                  {g.label} <Counter>{g.items.length}</Counter>
                </div>
                <ul className="divide-y divide-line border-b border-line last:border-b-0">
                  {g.items.map((t) => (
                    <TodoItem key={t.id} todo={t} today={today} onEdit={setEditing} />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <EmptyState icon="🎉" title="Inbox zero" text="No open todos. Add one above or enjoy the calm." />
          )
        ) : completed.length ? (
          <ul className="divide-y divide-line">
            {completed.map((t) => (
              <TodoItem key={t.id} todo={t} today={today} />
            ))}
          </ul>
        ) : (
          <EmptyState icon="📭" title="Nothing closed yet" text="Completed todos show up here and earn you XP." />
        )}
      </Box>

      <Dialog open={creating || !!editing} onClose={() => (setCreating(false), setEditing(null))} title={editing ? "Edit todo" : "New todo"}>
        {(creating || editing) && (
          <TodoForm
            key={editing?.id ?? "new"}
            todo={editing ?? undefined}
            today={today}
            onDone={() => (setCreating(false), setEditing(null))}
          />
        )}
      </Dialog>
    </>
  );
}

/** Today page panel: overdue + due today, with quick add defaulting to today. */
export function TodayTodos({ todos, today, openCount }: { todos: TodoDTO[]; today: DateKey; openCount: number }) {
  const sorted = sortOpen(todos);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Due today</h2>
        <Link href="/todos" className="text-xs text-accent hover:underline">
          All open ({openCount})
        </Link>
      </div>
      <Box>
        <div className="border-b border-line p-3">
          <QuickAddTodo today={today} defaultDue={today} />
        </div>
        {sorted.length ? (
          <ul className="divide-y divide-line">
            {sorted.map((t) => (
              <TodoItem key={t.id} todo={t} today={today} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted">Nothing due today. ✨</p>
        )}
      </Box>
    </section>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

