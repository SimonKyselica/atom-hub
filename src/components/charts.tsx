"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column = { label: string; value: number | null; tip: string; marked?: boolean };

/**
 * Single-series column chart. Bars ≤24px with 4px rounded caps on a shared
 * baseline, hairline grid, value labels only on `marked` columns, CSS tooltip
 * on hover and keyboard focus.
 */
export function ColumnChart({
  data,
  max,
  ticks,
  formatTick,
  formatValue,
  xLabelEvery = 1,
  height = 160,
  ariaLabel,
}: {
  data: Column[];
  max: number;
  ticks: number[];
  formatTick: (v: number) => string;
  formatValue: (v: number) => string;
  xLabelEvery?: number;
  height?: number;
  ariaLabel: string;
}) {
  const scale = (v: number) => (max ? Math.min(100, (v / max) * 100) : 0);
  return (
    <figure aria-label={ariaLabel}>
      <div className="flex">
        <div className="relative w-9 shrink-0 text-[10px] text-muted tabular-nums" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ bottom: `calc(${scale(t)}% - 0.5em)` }}>
              {formatTick(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-[var(--chart-grid)]" style={{ bottom: `${scale(t)}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={i}
                tabIndex={0}
                role="img"
                aria-label={d.tip}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
              >
                {d.value !== null && d.value > 0 && (
                  <div
                    className="w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                    style={{ height: `${scale(d.value)}%`, background: "var(--chart-series)" }}
                  />
                )}
                {d.marked && d.value !== null && (
                  <span
                    className="absolute text-xs font-semibold whitespace-nowrap text-fg"
                    style={{ bottom: `calc(${scale(d.value)}% + 4px)` }}
                  >
                    {formatValue(d.value)}
                  </span>
                )}
                <span
                  className="pointer-events-none absolute z-10 hidden rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg group-hover:block group-focus-visible:block"
                  style={{
                    bottom: `calc(${scale(d.value ?? 0)}% + ${d.marked ? 24 : 8}px)`,
                    background: "var(--tooltip-bg)",
                    color: "var(--tooltip-fg)",
                  }}
                >
                  {d.tip}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex pl-9 text-[11px] text-muted" aria-hidden>
        <div className="flex flex-1 gap-[2px]">
          {data.map((d, i) => (
            <span key={i} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
              {i % xLabelEvery === 0 ? d.label : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

export type Point = { label: string; value: number | null; tip: string };

/** Single-series line (2px) with a 10% area wash, end-dot with surface ring, crosshair + tooltip. */
export function LineChart({
  data,
  max,
  ticks,
  formatTick,
  formatValue,
  height = 180,
  ariaLabel,
}: {
  data: Point[];
  max: number;
  ticks: number[];
  formatTick: (v: number) => string;
  formatValue: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padTop = 16;
  const padRight = 36; // room for the end label
  const plotW = Math.max(0, width - padRight);
  const plotH = height - padTop;
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => padTop + plotH - (Math.min(v, max) / max) * plotH;

  const points = data.map((d, i) => (d.value === null ? null : ([x(i), y(d.value)] as const)));
  const segments: string[] = [];
  let current = "";
  points.forEach((p) => {
    if (!p) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  });
  if (current) segments.push(current);

  const valid = points.map((p, i) => [p, i] as const).filter(([p]) => p);
  const area =
    valid.length > 1
      ? `M${valid[0][0]![0]},${y(0)} ` + valid.map(([p]) => `L${p![0]},${p![1]}`).join(" ") + ` L${valid[valid.length - 1][0]![0]},${y(0)} Z`
      : "";
  const last = valid[valid.length - 1];

  function onMove(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    const rel = e.clientX - rect.left;
    const i = Math.round((rel / Math.max(plotW, 1)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  return (
    <figure aria-label={ariaLabel} className="flex">
      <div className="relative w-9 shrink-0 text-[10px] text-muted tabular-nums" style={{ height }} aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: y(t) }}>
            {formatTick(t)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div
          ref={ref}
          className="relative"
          style={{ height }}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {width > 0 && (
            <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden>
              {ticks.map((t) => (
                <line key={t} x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              ))}
              {area && <path d={area} fill="var(--chart-series)" opacity={0.1} />}
              {segments.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="var(--chart-series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {hover !== null && (
                <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={y(0)} stroke="var(--fg-muted)" strokeWidth={1} />
              )}
              {hover !== null && points[hover] && (
                <circle cx={points[hover]![0]} cy={points[hover]![1]} r={4} fill="var(--chart-series)" stroke="var(--bg)" strokeWidth={2} />
              )}
              {last && (
                <>
                  <circle cx={last[0]![0]} cy={last[0]![1]} r={4} fill="var(--chart-series)" stroke="var(--bg)" strokeWidth={2} />
                  <text x={last[0]![0] + 8} y={last[0]![1] + 4} fontSize={12} fontWeight={600} fill="var(--fg)">
                    {formatValue(data[last[1]].value!)}
                  </text>
                </>
              )}
            </svg>
          )}
          {hover !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg"
              style={{ left: x(hover), top: 0, background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" }}
            >
              {data[hover].tip}
            </div>
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted" style={{ width: plotW || undefined }} aria-hidden>
          <span>{data[0]?.label}</span>
          <span>{data[Math.floor((data.length - 1) / 2)]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </figure>
  );
}

/** Every chart's table twin — the values without hovering. */
export function DataTable({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs text-muted select-none hover:text-fg">Show as table</summary>
      <table className="mt-2 w-full text-left text-xs">
        <thead className="text-muted">
          <tr>
            <th className="py-1 font-medium">{head[0]}</th>
            <th className="py-1 text-right font-medium">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([a, b], i) => (
            <tr key={i}>
              <td className="py-1">{a}</td>
              <td className="py-1 text-right tabular-nums">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function StatTile({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: { text: string; good: boolean | null };
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-canvas px-4 py-3", className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold">{value}</p>
      {delta && (
        <p className={cn("text-xs font-medium", delta.good === null ? "text-muted" : delta.good ? "text-success" : "text-danger")}>
          {delta.text}
        </p>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
