import type { Metadata } from "next";
import { OverallGraph } from "@/components/graphs";
import { Identicon } from "@/components/identicon";
import { CoinAmount, LevelCard } from "@/components/level-badge";
import { AchievementGrid, ActivityFeed } from "@/components/profile";
import { LogoutButton, SettingsForm } from "@/components/profile-client";
import { InstallCard } from "@/components/pwa";
import { Box } from "@/components/ui";
import { requireUser, userToday } from "@/lib/dal";
import { getActivity, getContributions, getProfileCounts, toViewer } from "@/lib/data";
import { parseKey } from "@/lib/dates";
import { dayStreak, longestDayStreak } from "@/lib/streaks";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const viewer = toViewer(user);
  const today = userToday(user);
  const [counts, activity, totals] = await Promise.all([
    getContributions(user._id),
    getActivity(user._id),
    getProfileCounts(user._id),
  ]);

  const dates = new Set(Object.keys(counts));
  const firstYear = parseKey(
    [...dates].reduce((min, d) => (d < min ? d : min), today),
  ).getUTCFullYear();
  const thisYear = parseKey(today).getUTCFullYear();
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);

  const stats = [
    { label: "Total XP", value: user.xp.toLocaleString("en-US") },
    { label: "Contributions", value: (totals.habitsDone + totals.todosDone).toLocaleString("en-US") },
    { label: "Current streak", value: `${dayStreak(dates, today)} days` },
    { label: "Longest streak", value: `${longestDayStreak(dates)} days` },
    { label: "Perfect days", value: totals.perfectDays },
    { label: "Todos closed", value: totals.todosDone },
    { label: "Active habits", value: totals.activeHabits },
    { label: "Rewards redeemed", value: totals.rewardsRedeemed },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <div className="flex items-center gap-4 md:block">
          <Identicon seed={viewer.id} size={96} className="ring-1 ring-line md:h-[260px] md:w-[260px]" />
          <div className="md:mt-4">
            <h1 className="text-2xl leading-tight font-semibold">{viewer.name}</h1>
            <p className="text-muted">{viewer.email}</p>
          </div>
        </div>
        <LevelCard xp={viewer.xp} />
        <div className="flex items-center gap-2 text-sm">
          <CoinAmount coins={viewer.coins} /> <span className="text-muted">coins</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="min-w-0 space-y-8">
        <AchievementGrid unlocked={viewer.achievements} />
        <OverallGraph counts={counts} today={today} weekStart={viewer.weekStart} years={years} />
        <ActivityFeed items={activity} today={today} />

        <section className="space-y-4">
          <h2 className="text-base font-semibold">Settings</h2>
          <InstallCard />
          <Box className="p-4">
            <SettingsForm name={viewer.name} weekStart={viewer.weekStart} timezone={viewer.timezone} />
          </Box>
          <LogoutButton />
        </section>
      </div>
    </div>
  );
}
