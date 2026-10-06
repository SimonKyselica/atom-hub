import "server-only";
import { dayOfWeek, type DateKey } from "./dates";
import { Habit, HabitLog, Todo, Transaction, User, type IHabit, type ITransaction, type IUser } from "./models";
import type { QuestDTO } from "./types";

type Ctx = {
  scheduled: number;
  habitsDone: number;
  doneBefore: (hour: number) => number;
  todosClosed: number;
  openTodos: number;
  hasHard: boolean;
  hardDone: boolean;
  perfect: boolean;
  xp: number;
  hasCountHabit: boolean;
  countHit: boolean;
};

type Template = {
  key: string;
  icon: string;
  reward: number;
  title: (goal: number) => string;
  feasible: (c: Ctx) => boolean;
  goal: (c: Ctx) => number;
  progress: (c: Ctx) => number;
};

const TEMPLATES: Template[] = [
  {
    key: "triple",
    icon: "🎯",
    reward: 15,
    title: (n) => `Complete ${n} habits`,
    feasible: (c) => c.scheduled >= 2,
    goal: (c) => Math.min(3, c.scheduled),
    progress: (c) => c.habitsDone,
  },
  {
    key: "early_bird",
    icon: "🌅",
    reward: 20,
    title: () => "Complete a habit before 9:00",
    feasible: (c) => c.scheduled >= 1,
    goal: () => 1,
    progress: (c) => c.doneBefore(9),
  },
  {
    key: "morning_double",
    icon: "☀️",
    reward: 20,
    title: () => "Complete 2 habits before noon",
    feasible: (c) => c.scheduled >= 2,
    goal: () => 2,
    progress: (c) => c.doneBefore(12),
  },
  {
    key: "todo_pair",
    icon: "📋",
    reward: 15,
    title: (n) => `Close ${n} todos`,
    feasible: (c) => c.openTodos >= 2,
    goal: () => 2,
    progress: (c) => c.todosClosed,
  },
  {
    key: "hard_mode",
    icon: "💪",
    reward: 20,
    title: () => "Finish something hard",
    feasible: (c) => c.hasHard,
    goal: () => 1,
    progress: (c) => Number(c.hardDone),
  },
  {
    key: "perfect",
    icon: "🌟",
    reward: 25,
    title: () => "Have a perfect day",
    feasible: (c) => c.scheduled >= 2,
    goal: () => 1,
    progress: (c) => Number(c.perfect),
  },
  {
    key: "xp_hunter",
    icon: "⚡",
    reward: 15,
    title: (n) => `Earn ${n} XP today`,
    feasible: (c) => c.scheduled >= 3,
    goal: () => 60,
    progress: (c) => c.xp,
  },
  {
    key: "full_count",
    icon: "💧",
    reward: 15,
    title: () => "Hit the target on a counted habit",
    feasible: (c) => c.hasCountHabit,
    goal: () => 1,
    progress: (c) => Number(c.countHit),
  },
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function buildContext(user: IUser, today: DateKey): Promise<Ctx> {
  const userId = user._id;
  const [habits, txs, openTodos, hardTodo] = await Promise.all([
    Habit.find({ userId, archived: false, startDate: { $lte: today } }).lean<IHabit[]>(),
    Transaction.find({ userId, date: today, kind: { $in: ["habit", "todo", "perfect_day"] } }).lean<ITransaction[]>(),
    Todo.countDocuments({ userId, done: false }),
    Todo.exists({ userId, done: false, difficulty: "hard" }),
  ]);
  const scheduled = habits.filter((h) => h.days.includes(dayOfWeek(today)));
  const countHabits = scheduled.filter((h) => h.type === "count");
  const countHit = countHabits.length
    ? !!(await HabitLog.exists({ habitId: { $in: countHabits.map((h) => h._id) }, date: today, done: true }))
    : false;

  const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: user.timezone });
  const habitTx = txs.filter((t) => t.kind === "habit");
  return {
    scheduled: scheduled.length,
    habitsDone: habitTx.length,
    doneBefore: (hour) => habitTx.filter((t) => Number(hourFmt.format(new Date(t.createdAt))) < hour).length,
    todosClosed: txs.filter((t) => t.kind === "todo").length,
    // Count today's closed todos too, so closing them doesn't make the quest look infeasible.
    openTodos: openTodos + txs.filter((t) => t.kind === "todo").length,
    hasHard: scheduled.some((h) => h.difficulty === "hard") || !!hardTodo,
    hardDone: txs.some((t) => t.kind !== "perfect_day" && t.xp >= 40),
    perfect: txs.some((t) => t.kind === "perfect_day"),
    xp: txs.reduce((sum, t) => sum + Math.max(0, t.xp), 0),
    hasCountHabit: countHabits.length > 0,
    countHit,
  };
}

/** Today's three quests with live progress. Picks (and stores) them on the first call of the day. */
export async function getQuests(user: IUser, today: DateKey): Promise<QuestDTO[]> {
  const ctx = await buildContext(user, today);
  let items = user.quests?.date === today ? user.quests.items : null;

  if (!items) {
    const picked = seededShuffle(
      TEMPLATES.filter((t) => t.feasible(ctx)),
      `${user._id}:${today}`,
    ).slice(0, 3);
    items = picked.map((t) => ({ key: t.key, goal: t.goal(ctx) }));
    // Lock in only a full set; a brand-new account gets quests once it has habits.
    if (items.length === 3) {
      await User.updateOne({ _id: user._id, "quests.date": { $ne: today } }, { $set: { quests: { date: today, items } } });
    }
  }

  const claimed = new Set(
    await Transaction.distinct("refId", { userId: user._id, kind: "quest", date: today }),
  );
  return items.flatMap(({ key, goal }) => {
    const t = BY_KEY.get(key);
    if (!t) return [];
    return [
      {
        key,
        icon: t.icon,
        title: t.title(goal),
        goal,
        progress: Math.min(goal, t.progress(ctx)),
        reward: t.reward,
        claimed: claimed.has(key),
      },
    ];
  });
}

export async function questReady(user: IUser, today: DateKey, key: string) {
  const quest = (await getQuests(user, today)).find((q) => q.key === key);
  return quest && !quest.claimed && quest.progress >= quest.goal ? quest : null;
}

