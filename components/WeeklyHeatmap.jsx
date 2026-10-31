/**
 * Week grid of how many restaurants are open at the start of each hour.
 * Shade scales with that count relative to the busiest hour. Choosing a
 * cell sets the query to that weekday and hour.
 */

import { heatmapCellLabel } from "../lib/hours";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// Index 0 is an empty hour: no restaurant is open. It stays neutral zinc.
// Steps 1–6 are one blue scale. Light mode runs from a light blue through
// royal blue to navy at step 6, so a busier hour is darker.
// Dark mode reverses that: a busier hour is lighter, up to a light blue.
// The empty cell is dark in that mode, and a navy fill would blend into it,
// so lightness rises with the count to keep every step distinct from empty.
const SHADE = [
  "bg-zinc-200 dark:bg-zinc-800",
  "bg-[#2E7FD8] dark:bg-[#0079E1]",
  "bg-[#1B71C8] dark:bg-[#2D89E7]",
  "bg-[#0062B8] dark:bg-[#4898EE]",
  "bg-[#005098] dark:bg-[#60A7F4]",
  "bg-[#003F7A] dark:bg-[#77B6F9]",
  "bg-[#002E5D] dark:bg-blue-300",
];

// Light zinc clears the darkest step. Dark zinc clears the empty cell and
// the light-blue steps. The same pair works in both modes: dark mode's
// busiest step is the light one.
const CELL_FOCUS =
  "focus-visible:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-100 focus-visible:shadow-[0_0_0_1px_#18181b] disabled:opacity-60";
const CELL_SELECTED =
  "z-10 ring-2 ring-zinc-100 ring-offset-1 ring-offset-zinc-900";

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
 * Shade step for one cell. Math.max(1, ...) keeps any non-zero count off the
 * empty color, so a single open restaurant stays visible when another hour
 * is much busier.
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
                    className={`h-8 w-full rounded-sm ${CELL_FOCUS} ${shadeClass(count, maxCount)} ${
                      selected ? CELL_SELECTED : ""
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
