import { levelProgress } from "@/lib/game";
import { ProgressBar } from "./ui";
import { cn } from "@/lib/cn";

export function CoinAmount({ coins, className }: { coins: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", coins < 0 ? "text-danger" : "text-coin", className)}>
      <span aria-hidden>🪙</span>
      {coins.toLocaleString("en-US")}
      <span className="sr-only">coins</span>
    </span>
  );
}

/** Compact level + XP bar used in the header. */
export function LevelChip({ xp }: { xp: number }) {
  const p = levelProgress(xp);
  return (
    <div className="flex items-center gap-2" title={`${p.title} · ${p.current}/${p.needed} XP to level ${p.level + 1}`}>
      <span className="rounded-full border border-done/40 bg-done-muted px-2 py-px text-xs font-semibold text-done">
        Lv {p.level}
      </span>
      <ProgressBar percent={p.percent} className="hidden h-1.5 w-20 sm:block" barClassName="bg-done" />
    </div>
  );
}

export function LevelCard({ xp }: { xp: number }) {
  const p = levelProgress(xp);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-done">Level {p.level}</span>
          <span className="ml-2 text-sm text-muted">{p.title}</span>
        </div>
        <span className="text-xs text-muted tabular-nums">
          {p.current.toLocaleString("en-US")} / {p.needed.toLocaleString("en-US")} XP
        </span>
      </div>
      <ProgressBar percent={p.percent} className="mt-1.5" barClassName="bg-done" />
    </div>
  );
}
