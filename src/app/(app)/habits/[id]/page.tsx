import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HabitDetail } from "@/components/habits";
import { requireUser, userToday } from "@/lib/dal";
import { getHabits } from "@/lib/data";

export const metadata: Metadata = { title: "Habit" };

export default async function HabitPage({ params }: PageProps<"/habits/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const today = userToday(user);
  const [habit] = await getHabits(user._id, today, { habitId: id });
  if (!habit) notFound();
  return <HabitDetail habit={habit} today={today} weekStart={user.weekStart} />;
}
