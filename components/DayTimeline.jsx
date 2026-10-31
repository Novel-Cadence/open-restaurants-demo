/**
 * Bars for when each restaurant is open on one local day.
 * An interval that began the previous night is included, clipped at midnight.
 */

import { formatClock } from "../lib/query";

const TICKS = [
  { hour: 0, label: "12 am" },
  { hour: 6, label: "6 am" },
  { hour: 12, label: "12 pm" },
  { hour: 18, label: "6 pm" },
];

/**
 * @param {{ start: number, end: number }} segment
 * @returns {string}
 */
function segmentText(segment) {
  return `${formatClock(segment.start)} to ${formatClock(segment.end)}`;
}

/**
 * @param {{
 *   dayName: string,
 *   minutes: number,
 *   rows: { name: string, segments: { start: number, end: number }[] }[],
 * }} props
 */
export default function DayTimeline({ dayName, minutes, rows }) {
  const markerLabel = formatClock(minutes);

  return (
    <section aria-labelledby="day-timeline-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="day-timeline-heading" className="text-lg font-medium">
          Hours on {dayName}
        </h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Bars show when each restaurant is open on this day, including hours
          that started the night before. The marker is at {markerLabel}.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No restaurants are open on this day.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[36rem]">
            <div className="grid grid-cols-[minmax(8.5rem,12rem)_minmax(0,1fr)] gap-x-3">
              <div />
              <div
                aria-hidden="true"
                className="relative mb-1 h-5 text-[10px] text-zinc-500 dark:text-zinc-400"
              >
                {TICKS.map((tick) => (
                  <span
                    key={tick.hour}
                    className={`absolute top-0 ${tick.hour === 0 ? "left-0" : "-translate-x-1/2"}`}
                    style={{
                      left: tick.hour === 0 ? undefined : `${(tick.hour / 24) * 100}%`,
                    }}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            </div>
            <ul className="flex flex-col">
              {rows.map((row) => {
                const hours = row.segments.map(segmentText).join(", ");
                return (
                  <li
                    key={row.name}
                    aria-label={`${row.name}: ${hours}`}
                    className="grid grid-cols-[minmax(8.5rem,12rem)_minmax(0,1fr)] items-center gap-x-3 py-0.5"
                  >
                    <span
                      aria-hidden="true"
                      title={row.name}
                      className="truncate text-sm"
                    >
                      {row.name}
                    </span>
                    <div className="relative h-4">
                      {/* 1440 units across: one per minute of the local day. */}
                      <svg
                        viewBox="0 0 1440 16"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        className="h-4 w-full"
                      >
                        <rect
                          width="1440"
                          height="16"
                          className="fill-zinc-200 dark:fill-zinc-800"
                        />
                        {row.segments.map((segment) => (
                          <rect
                            key={`${segment.start}-${segment.end}`}
                            x={segment.start}
                            y="3"
                            width={segment.end - segment.start}
                            height="10"
                            className="fill-emerald-800 dark:fill-emerald-300"
                          />
                        ))}
                      </svg>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-zinc-950 dark:bg-zinc-50"
                        style={{ left: `${(minutes / 1440) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
