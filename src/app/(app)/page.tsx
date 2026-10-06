import { InstallCard } from "@/components/pwa";
import { OverallGraph } from "@/components/graphs";
import { LevelCard, CoinAmount } from "@/components/level-badge";
import { TodayHabits } from "@/components/today-habits";
import { TodayTodos } from "@/components/todos";
import { Box } from "@/components/ui";
import { requireUser, userToday } from "@/lib/dal";
import { getContributions, getHabits, getTodos } from "@/lib/data";
import { formatKey } from "@/lib/dates";
import { dayStreak } from "@/lib/streaks";

function greeting(timezone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(new Date()));
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const user = await requireUser();
  const today = userToday(user);
  const [habits, counts, todos] = await Promise.all([
    getHabits(user._id, today),
    getContributions(user._id),
    getTodos(user._id),
  ]);
  const streak = dayStreak(new Set(Object.keys(counts)), today);
  const due = todos.active.filter((t) => t.dueDate !== null && t.dueDate <= today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">
          {greeting(user.timezone)}, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted">{formatKey(today, { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      <Box className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
        <LevelCard xp={user.xp} />
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-muted">Streak</p>
            <p className="text-lg font-semibold tabular-nums">
              🔥 {streak} <span className="text-sm font-normal text-muted">day{streak === 1 ? "" : "s"}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Coins</p>
            <CoinAmount coins={user.coins} className="text-lg" />
          </div>
        </div>
      </Box>

      <InstallCard dismissible />

      <div className="order-2 md:order-1">
        <OverallGraph counts={counts} today={today} weekStart={user.weekStart} />
      </div>

      <div className="order-1 grid gap-6 md:order-2 md:grid-cols-[minmax(0,1fr)_340px]">
        <TodayHabits habits={habits} today={today} weekStart={user.weekStart} />
        <TodayTodos todos={due} today={today} openCount={todos.active.length} />
      </div>
    </div>
  );
}
