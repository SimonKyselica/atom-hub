"use client";

import Link from "next/link";
import { formatKey } from "@/lib/dates";
import type { InsightsDTO } from "@/lib/insights";
import { MasteryIcon } from "./mastery";
import { ColumnChart, DataTable, LineChart, StatTile } from "./charts";
import { Box } from "./ui";

const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const percent = (v: number) => `${v}%`;

function hourLabel(h: number) {
  const suffix = h < 12 ? "a" : "p";
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}

function hourRange(h: number) {
  const fmt = (x: number) => `${x % 12 === 0 ? 12 : x % 12} ${x < 12 || x === 24 ? "AM" : "PM"}`;
  return `${fmt(h)}–${fmt((h + 1) % 24 || 24)}`.replace("12 AM–1 AM", "Midnight–1 AM");
}

/** Round a max up to a clean axis value. */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= v)!;
  return step * pow;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-muted">{subtitle}</p>}
      <Box className="p-4">{children}</Box>
    </section>
  );
}

export function InsightsView({ data }: { data: InsightsDTO }) {
  if (!data.hasData) {
    return (
      <Box className="px-6 py-12 text-center">
        <p className="text-3xl">📊</p>
        <p className="mt-2 font-semibold">Not enough data yet</p>
        <p className="mt-1 text-sm text-muted">Complete habits for a few days and your patterns will show up here.</p>
      </Box>
    );
  }

  const { kpis } = data;
  const rateDelta = kpis.rate30 !== null && kpis.rate30Prev !== null ? kpis.rate30 - kpis.rate30Prev : null;
  const weekDelta = kpis.week - kpis.weekPrev;

  const bestDow = kpis.bestDay?.dow;
  const weekdayCols = data.weekdays.map((w) => ({
    label: DAY_SHORT[w.dow],
    value: w.rate,
    marked: w.dow === bestDow,
    tip: w.rate === null ? `${DAY_LONG[w.dow]}s: nothing scheduled` : `${DAY_LONG[w.dow]}s: ${w.rate}% done`,
  }));

  const peak = data.hours.indexOf(Math.max(...data.hours));
  const hoursMax = niceMax(Math.max(...data.hours));
  const hourCols = data.hours.map((n, h) => ({
    label: hourLabel(h),
    value: n,
    marked: n > 0 && h === peak,
    tip: `${hourRange(h)}: ${n} check-in${n === 1 ? "" : "s"}`,
  }));

  const trendPoints = data.trend.map((w) => {
    const label = formatKey(w.start, { month: "short", day: "numeric" });
    return { label, value: w.rate, tip: w.rate === null ? `Week of ${label}: no data` : `Week of ${label}: ${w.rate}%` };
  });

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        <StatTile
          label="Completion, last 30 days"
          value={kpis.rate30 === null ? "—" : `${kpis.rate30}%`}
          delta={
            rateDelta === null
              ? undefined
              : { text: `${rateDelta > 0 ? "+" : rateDelta < 0 ? "−" : "±"}${Math.abs(rateDelta)} pts vs previous 30`, good: rateDelta === 0 ? null : rateDelta > 0 }
          }
        />
        <StatTile
          label="Contributions, last 7 days"
          value={kpis.week.toLocaleString("en-US")}
          delta={{ text: `${weekDelta > 0 ? "+" : weekDelta < 0 ? "−" : "±"}${Math.abs(weekDelta)} vs week before`, good: weekDelta === 0 ? null : weekDelta > 0 }}
        />
        <StatTile label="Perfect days, last 30" value={kpis.perfect30} hint="Every scheduled habit done" />
        <StatTile
          label="Best weekday"
          value={kpis.bestDay ? DAY_LONG[kpis.bestDay.dow] : "—"}
          hint={kpis.bestDay ? `${kpis.bestDay.rate}% done, last 12 weeks` : "Needs a few weeks of data"}
        />
      </dl>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Completion by weekday" subtitle="Share of scheduled habits done, last 12 weeks.">
          <ColumnChart
            data={weekdayCols}
            max={100}
            ticks={[0, 50, 100]}
            formatTick={percent}
            formatValue={percent}
            ariaLabel="Completion rate by weekday"
          />
          <DataTable
            head={["Weekday", "Completion"]}
            rows={data.weekdays.map((w) => [DAY_LONG[w.dow], w.rate === null ? "—" : `${w.rate}%`])}
          />
        </Section>

        <Section title="Weekly trend" subtitle="Completion rate per week, last 12 weeks.">
          <LineChart data={trendPoints} max={100} ticks={[0, 50, 100]} formatTick={percent} formatValue={percent} ariaLabel="Weekly completion trend" />
          <DataTable head={["Week of", "Completion"]} rows={trendPoints.map((p) => [p.label, p.value === null ? "—" : `${p.value}%`])} />
        </Section>
      </div>

      <Section
        title="When you check in"
        subtitle={
          data.hours.some((n) => n > 0)
            ? `Habits logged by hour, last 90 days. Your peak is ${hourRange(peak)}.`
            : "Habits logged by hour, last 90 days."
        }
      >
        <ColumnChart
          data={hourCols}
          max={hoursMax}
          ticks={[0, hoursMax / 2, hoursMax]}
          formatTick={(v) => String(Math.round(v))}
          formatValue={(v) => String(v)}
          xLabelEvery={6}
          height={120}
          ariaLabel="Check-ins by hour of day"
        />
        <DataTable head={["Hour", "Check-ins"]} rows={data.hours.map((n, h) => [hourRange(h), n])} />
      </Section>

      <section>
        <h2 className="text-base font-semibold">Habit consistency</h2>
        <p className="mb-3 text-sm text-muted">Last 30 days, most consistent first.</p>
        <Box className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-subtle text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Habit</th>
                <th className="px-3 py-2 font-medium">Last 30 days</th>
                <th className="px-3 py-2 text-right font-medium">Streak</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Best</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.habits.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2">
                    <Link href={`/habits/${h.id}`} className="font-semibold hover:text-accent hover:underline">
                      {h.emoji} {h.name}
                    </Link>
                    <MasteryIcon total={h.total} className="ml-1" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-success-muted sm:w-24">
                        <div className="h-full rounded-full bg-[var(--chart-series)]" style={{ width: `${h.rate30 ?? 0}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{h.rate30 === null ? "—" : `${h.rate30}%`}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{h.current ? `🔥 ${h.current}` : "0"}</td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{h.longest}</td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{h.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </section>
    </div>
  );
}
