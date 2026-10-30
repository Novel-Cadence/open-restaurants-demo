import { heatmapCellLabel } from "../lib/hours";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const SHADE = [
  "bg-zinc-200 dark:bg-zinc-800",
  "bg-emerald-100 dark:bg-emerald-950",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-300 dark:bg-emerald-800",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-600 dark:bg-emerald-500",
  "bg-emerald-800 dark:bg-emerald-300",
];

/**
 * @param {number} hour
 * @returns {string}
 */
function compactHour(hour) {
  const suffix = hour < 12 ? "a" : "p";
  const clock = hour % 12 || 12;
  return `${clock}${suffix}`;
}

/**
 * @param {number} count
 * @param {number} max
 * @returns {string}
 */
function shadeClass(count, max) {
  if (count <= 0 || max <= 0) return SHADE[0];
  const scaled = Math.round((count / max) * (SHADE.length - 1));
  const index = Math.max(1, Math.min(SHADE.length - 1, scaled));
  return SHADE[index];
}

/**
 * @param {{
 *   counts: number[][],
 *   dayLabels: string[],
 *   selectedDay: number | null,
 *   selectedHour: number | null,
 *   disabled: boolean,
 *   onSelect: (day: number, hour: number) => void,
 * }} props
 */
export default function WeeklyHeatmap({
  counts,
  dayLabels,
  selectedDay,
  selectedHour,
  disabled,
  onSelect,
}) {
  const maxCount = counts.reduce((max, day) => Math.max(max, ...day), 0);

  return (
    <section aria-labelledby="weekly-heatmap-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="weekly-heatmap-heading" className="text-lg font-medium">
          Weekly heatmap
        </h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Shade shows how many restaurants are open at the start of each hour.
          Choose a cell to set that day and hour.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div
          role="group"
          aria-label="Restaurants open by day and hour"
          className="min-w-[46rem] space-y-px p-1"
        >
          <div className="grid grid-cols-[3.25rem_repeat(24,minmax(1.75rem,1fr))] gap-px">
            <div className="sticky left-0 z-20 bg-zinc-50 dark:bg-black" />
            {HOURS.map((hour) => (
              <div
                key={hour}
                aria-hidden="true"
                className="pb-1 text-center text-[10px] leading-4 text-zinc-500 dark:text-zinc-400"
              >
                {compactHour(hour)}
              </div>
            ))}
          </div>
          {counts.map((dayCounts, day) => (
            <div
              key={dayLabels[day]}
              className="grid grid-cols-[3.25rem_repeat(24,minmax(1.75rem,1fr))] gap-px"
            >
              <div className="sticky left-0 z-20 flex items-center bg-zinc-50 pr-2 text-xs font-medium dark:bg-black">
                {dayLabels[day]}
              </div>
              {dayCounts.map((count, hour) => {
                const label = heatmapCellLabel(day, hour, count);
                const selected = selectedDay === day && selectedHour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={disabled}
                    aria-label={label}
                    aria-current={selected ? "true" : undefined}
                    title={label}
                    onClick={() => onSelect(day, hour)}
                    className={`h-8 w-full rounded-sm focus-visible:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:focus-visible:outline-zinc-100 ${shadeClass(count, maxCount)} ${
                      selected
                        ? "z-10 ring-2 ring-zinc-950 ring-offset-1 ring-offset-zinc-50 dark:ring-zinc-50 dark:ring-offset-black"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <span>Fewer</span>
        <span className="flex h-3 w-28 overflow-hidden rounded-sm" aria-hidden="true">
          {SHADE.map((shade) => (
            <span key={shade} className={`h-full flex-1 ${shade}`} />
          ))}
        </span>
        <span>More ({maxCount} open)</span>
      </div>
    </section>
  );
}
