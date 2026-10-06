import type { Metadata } from "next";
import { HabitList } from "@/components/habits";
import { requireUser, userToday } from "@/lib/dal";
import { getFrozen, getHabits } from "@/lib/data";

export const metadata: Metadata = { title: "Habits" };

export default async function HabitsPage() {
  const user = await requireUser();
  const today = userToday(user);
  const [all, frozen] = await Promise.all([getHabits(user._id, today, { archived: true }), getFrozen(user._id)]);
  return (
    <HabitList
      habits={all.filter((h) => !h.archived)}
      archived={all.filter((h) => h.archived)}
      today={today}
      weekStart={user.weekStart}
      frozen={frozen}
    />
  );
}
