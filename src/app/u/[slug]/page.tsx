import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { HabitGraph, OverallGraph } from "@/components/graphs";
import { Identicon } from "@/components/identicon";
import { LevelCard } from "@/components/level-badge";
import { MasteryIcon } from "@/components/mastery";
import { AchievementGrid } from "@/components/profile";
import { Box } from "@/components/ui";
import { userToday } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { getContributions, getFrozen, getHabits, getProfileCounts, toViewer } from "@/lib/data";
import { parseKey } from "@/lib/dates";
import { levelProgress } from "@/lib/game";
import { User, type IUser } from "@/lib/models";
import { dayStreak, longestDayStreak } from "@/lib/streaks";

const loadProfile = cache(async (slug: string) => {
  if (!/^[A-Za-z0-9_-]{6,24}$/.test(slug)) return null;
  await connectDB();
  return User.findOne({ publicSlug: slug, publicEnabled: true }).lean<IUser>();
});

export async function generateMetadata({ params }: PageProps<"/u/[slug]">): Promise<Metadata> {
  const user = await loadProfile((await params).slug);
  if (!user) return { title: "Profile not found" };
  const p = levelProgress(user.xp);
  return {
    title: `${user.name}'s contributions`,
    description: `Level ${p.level} ${p.title} on Atom Hub.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/u/[slug]">) {
  const user = await loadProfile((await params).slug);
  if (!user) notFound();

  const viewer = toViewer(user);
  const today = userToday(user);
  const [counts, frozenList, totals, habits] = await Promise.all([
    getContributions(user._id),
    getFrozen(user._id),
    getProfileCounts(user._id),
    user.publicShowHabits ? getHabits(user._id, today) : Promise.resolve([]),
  ]);
  const dates = new Set(Object.keys(counts));
  const frozen = new Set(frozenList);
  const firstYear = parseKey([...dates].reduce((min, d) => (d < min ? d : min), today)).getUTCFullYear();
  const thisYear = parseKey(today).getUTCFullYear();
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);

  const stats = [
    { label: "Current streak", value: `🔥 ${dayStreak(dates, today, frozen)} days` },
    { label: "Longest streak", value: `${longestDayStreak(dates, frozen)} days` },
    { label: "Contributions", value: (totals.habitsDone + totals.todosDone).toLocaleString("en-US") },
    { label: "Perfect days", value: totals.perfectDays },
  ];

  return (
    <div className="min-h-dvh">
      <header className="pt-safe border-b border-line bg-inset">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
            <span className="font-semibold">Atom Hub</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="flex items-center gap-4 md:block">
            <Identicon seed={viewer.id} size={96} className="ring-1 ring-line md:h-[260px] md:w-[260px]" />
            <h1 className="text-2xl leading-tight font-semibold md:mt-4">{viewer.name}</h1>
          </div>
          <LevelCard xp={viewer.xp} />
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
          <OverallGraph
            counts={counts}
            today={today}
            weekStart={viewer.weekStart}
            years={years}
            frozen={frozenList}
            footer="Completed habits and todos."
          />
          <AchievementGrid unlocked={viewer.achievements} onlyUnlocked />
          {habits.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold">Habits</h2>
              {habits.map((h) => (
                <Box key={h.id} className="p-3 sm:p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">{h.emoji}</span>
                    <span className="font-semibold">{h.name}</span>
                    <MasteryIcon total={h.stats.total} />
                    {h.stats.current > 0 && (
                      <span className="ml-auto text-sm font-semibold text-attention">🔥 {h.stats.current}</span>
                    )}
                  </div>
                  <HabitGraph habit={h} values={h.values} today={today} weekStart={viewer.weekStart} frozen={frozenList} />
                </Box>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
