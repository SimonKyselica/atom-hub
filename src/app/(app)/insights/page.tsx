import type { Metadata } from "next";
import { InsightsView } from "@/components/insights";
import { requireUser, userToday } from "@/lib/dal";
import { getInsights } from "@/lib/insights";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const user = await requireUser();
  const today = userToday(user);
  const data = await getInsights(user, today);
  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Insights</h1>
        <p className="text-sm text-muted">Patterns in your habits — when you show up, and where you slip.</p>
      </div>
      <InsightsView data={data} />
    </>
  );
}
