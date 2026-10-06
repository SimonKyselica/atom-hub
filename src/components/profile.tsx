// Server-renderable profile sections (no client hooks).
import { Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatKey, formatRelativeDue, type DateKey } from "@/lib/dates";
import type { ActivityDTO, ViewerDTO } from "@/lib/types";
import { Box, Counter } from "./ui";
import { cn } from "@/lib/cn";

export function AchievementGrid({ unlocked }: { unlocked: ViewerDTO["achievements"] }) {
  const have = new Map(unlocked.map((a) => [a.key, a.unlockedAt]));
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        Achievements <Counter>{`${have.size}/${ACHIEVEMENTS.length}`}</Counter>
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {ACHIEVEMENTS.map((a) => {
          const at = have.get(a.key);
          return (
            <div
              key={a.key}
              title={`${a.name} — ${a.description}${a.coins ? ` (+${a.coins} coins)` : ""}`}
              className={cn(
                "flex flex-col items-center rounded-md border p-2.5 text-center",
                at ? "border-attention/40 bg-attention-muted" : "border-line bg-subtle",
              )}
            >
              <span className={cn("relative text-3xl", !at && "opacity-30 grayscale")}>
                {a.icon}
                {!at && <Lock size={12} className="absolute -right-1 -bottom-0.5 text-muted" />}
              </span>
              <span className={cn("mt-1 text-xs leading-tight font-semibold", !at && "text-muted")}>{a.name}</span>
              <span className="mt-0.5 text-[10px] leading-tight text-muted">
                {at ? formatKey(at.slice(0, 10), { month: "short", day: "numeric", year: "numeric" }) : a.description}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const KIND_TEXT: Record<ActivityDTO["kind"], string> = {
  habit: "Completed",
  todo: "Closed",
  perfect_day: "Bonus",
  achievement: "Unlocked",
  reward: "Redeemed",
};

export function ActivityFeed({ items, today }: { items: ActivityDTO[]; today: DateKey }) {
  if (!items.length) return null;
  const groups = new Map<string, ActivityDTO[]>();
  for (const item of items) {
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date)!.push(item);
  }
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Contribution activity</h2>
      <div className="space-y-4">
        {[...groups].map(([date, rows]) => (
          <div key={date}>
            <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted">
              {formatRelativeDue(date, today)}
              <span className="h-px flex-1 bg-line" />
            </h3>
            <Box>
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-6 text-center text-base">{r.icon}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-muted">{KIND_TEXT[r.kind]} </span>
                      {r.label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {r.xp !== 0 && <span className="text-done">+{r.xp} XP </span>}
                      {r.coins !== 0 && <span className={r.coins > 0 ? "text-coin" : "text-danger"}>{r.coins > 0 ? `+${r.coins}` : r.coins} 🪙</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Box>
          </div>
        ))}
      </div>
    </section>
  );
}
