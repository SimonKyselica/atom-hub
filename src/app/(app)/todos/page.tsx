import type { Metadata } from "next";
import { TodoBoard } from "@/components/todos";
import { requireUser, userToday } from "@/lib/dal";
import { getTodos } from "@/lib/data";

export const metadata: Metadata = { title: "Todos" };

export default async function TodosPage() {
  const user = await requireUser();
  const { active, completed } = await getTodos(user._id);
  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Todos</h1>
        <p className="text-sm text-muted">Close tickets, earn XP. Every closed todo is a contribution.</p>
      </div>
      <TodoBoard active={active} completed={completed} today={userToday(user)} />
    </>
  );
}
