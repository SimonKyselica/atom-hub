"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, diffDays, formatKey, parseKey, startOfWeek, type DateKey } from "@/lib/dates";
import { WEEKDAYS_SHORT, type Palette } from "@/lib/game";
import { cn } from "@/lib/cn";

export type CellInfo = { level: 0 | 1 | 2 | 3 | 4; label: string; muted?: boolean };

type Props = {
  start: DateKey;
  end: DateKey;
  weekStart: number;
  palette?: Palette;
  getCell: (date: DateKey) => CellInfo;
  selected?: DateKey | null;
  onSelect?: (date: DateKey) => void;
  /** Left side of the legend row (GitHub's "Learn how we count contributions"). */
  footer?: ReactNode;
  legend?: { less: string; more: string; levels: CellInfo["level"][] };
  className?: string;
};

type Tip = { label: string; x: number; y: number; tapped: boolean };

export function ContributionGraph({
  start,
  end,
  weekStart,
  palette = "green",
  getCell,
  selected,
  onSelect,
  footer,
  legend = { less: "Less", more: "More", levels: [0, 1, 2, 3, 4] },
  className,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const { cells, months, weeks } = useMemo(() => {
    const gridStart = startOfWeek(start, weekStart);
    const weeks = Math.floor(diffDays(end, gridStart) / 7) + 1;
    const cells: { date: DateKey; col: number; row: number }[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const offset = diffDays(d, gridStart);
      cells.push({ date: d, col: Math.floor(offset / 7), row: offset % 7 });
    }
    // A month label sits over the first column that starts in that month.
    const months: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < weeks; col++) {
      const first = col === 0 ? start : addDays(gridStart, col * 7);
      const month = parseKey(first).getUTCMonth();
      if (month !== lastMonth) {
        months.push({ col, label: formatKey(first, { month: "short" }) });
        lastMonth = month;
      }
    }
    // Drop a leading label that would collide with the next one.
    if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();
    return { cells, months, weeks };
  }, [start, end, weekStart]);

  // Most recent days are on the right — show them first on narrow screens.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [start, end]);

  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    const timer = tip.tapped ? setTimeout(hide, 2500) : undefined; // taps never "leave"
    window.addEventListener("scroll", hide, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", hide, true);
    };
  }, [tip]);

  function showTip(target: HTMLElement, tapped = false) {
    const date = target.dataset.date;
    if (!date) return;
    const rect = target.getBoundingClientRect();
    setTip({ label: getCell(date).label, x: rect.left + rect.width / 2, y: rect.top, tapped });
  }

  const dayLabels = Array.from({ length: 7 }, (_, row) => (row + weekStart) % 7);
  const Cell = onSelect ? "button" : "div";

  return (
    <div className={cn(palette && `pal-${palette}`, className)}>
      <div ref={scrollRef} className="no-scrollbar overflow-x-auto overscroll-x-contain">
        <div
          role="grid"
          aria-label="Contribution graph"
          className="grid min-w-fit gap-[3px] text-xs text-fg"
          style={{
            gridTemplateColumns: `auto repeat(${weeks}, minmax(10px, 1fr))`,
            gridTemplateRows: `auto repeat(7, auto)`,
          }}
          onPointerOver={(e) => {
            const el = (e.target as HTMLElement).closest<HTMLElement>("[data-date]");
            if (el && e.pointerType === "mouse") showTip(el);
          }}
          onPointerLeave={() => setTip(null)}
        >
          {months.map((m) => (
            <span
              key={`${m.col}-${m.label}`}
              className="pb-1 leading-none whitespace-nowrap"
              style={{ gridColumn: m.col + 2, gridRow: 1 }}
            >
              {m.label}
            </span>
          ))}
          {dayLabels.map((dow, row) => (
            <span
              key={dow}
              className="sticky left-0 z-[1] bg-canvas pr-2 text-[11px] leading-none"
              style={{ gridColumn: 1, gridRow: row + 2, alignSelf: "center" }}
            >
              {dow % 2 === 1 ? WEEKDAYS_SHORT[dow] : ""}
            </span>
          ))}
          {cells.map(({ date, col, row }) => {
            const info = getCell(date);
            return (
              <Cell
                key={date}
                data-date={date}
                data-level={info.level}
                data-muted={info.muted || undefined}
                data-selected={selected === date || undefined}
                aria-label={info.label}
                className={cn("cell aspect-square w-full", onSelect && "cursor-pointer")}
                style={{ gridColumn: col + 2, gridRow: row + 2 }}
                {...(onSelect && {
                  type: "button" as const,
                  onClick: (e: React.MouseEvent<HTMLElement>) => {
                    onSelect(date);
                    showTip(e.currentTarget, true);
                  },
                })}
                {...(!onSelect && {
                  onClick: (e: React.MouseEvent<HTMLElement>) => showTip(e.currentTarget, true),
                })}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <div>{footer}</div>
        <div className="flex items-center gap-[3px]">
          <span className="mr-1">{legend.less}</span>
          {legend.levels.map((l) => (
            <span key={l} data-level={l} className="cell inline-block h-[10px] w-[10px]" />
          ))}
          <span className="ml-1">{legend.more}</span>
        </div>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg"
          style={{ left: tip.x, top: tip.y - 6, background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" }}
        >
          {tip.label}
        </div>
      )}
    </div>
  );
}

// ---------- Level helpers ----------

/** GitHub-style: bucket a day's count relative to the busiest day in range. */
export function countLevel(count: number, max: number): CellInfo["level"] {
  if (!count || !max) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as CellInfo["level"];
}

/** For a habit: how much of the daily target was hit. */
export function ratioLevel(value: number, target: number): CellInfo["level"] {
  if (!value) return 0;
  const r = value / target;
  if (r >= 1) return 4;
  if (r >= 0.66) return 3;
  if (r >= 0.33) return 2;
  return 1;
}
