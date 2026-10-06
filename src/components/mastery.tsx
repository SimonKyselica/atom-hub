import { masteryFor } from "@/lib/game";
import { ProgressBar } from "./ui";
import { cn } from "@/lib/cn";

/** Tier medal next to a habit name (nothing before Bronze). */
export function MasteryIcon({ total, className }: { total: number; className?: string }) {
  const { current } = masteryFor(total);
  if (!current) return null;
  return (
    <span className={cn("inline-block", className)} title={`${current.name} mastery`} aria-label={`${current.name} mastery`}>
      {current.icon}
    </span>
  );
}

export function MasteryProgress({ total }: { total: number }) {
  const { current, next, percent } = masteryFor(total);
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">
          {current ? `${current.icon} ${current.name} mastery` : "Mastery"}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {next ? `${total}/${next.at} to ${next.icon} ${next.name}` : "Maxed out — legendary 💎"}
        </span>
      </div>
      <ProgressBar percent={percent} className="mt-2 h-1.5" barClassName="!bg-attention" />
      {next && (
        <p className="mt-1.5 text-xs text-muted">
          Reaching {next.name} pays <span className="text-coin">+{next.coins} coins</span>.
        </p>
      )}
    </div>
  );
}
