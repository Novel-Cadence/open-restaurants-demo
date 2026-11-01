/**
 * Week grid of how many restaurants are open at the start of each hour.
 * Shade scales with that count relative to the busiest hour. Choosing a
 * cell sets the query to that weekday and hour. Selection and focus stay
 * visible on every shade in light, dark, and forced colors.
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

// Selection is inset, 2px + 2px. An outside ring would sit in the 1px grid
// gap and slide under the sticky day labels. The first shadow is painted on
// top, so it is the outer band, next to the page. The wider shadow shows
// only inside that, next to the fill.
// Black is the page tone in light mode (the page is zinc-50). White is the
// page tone in dark mode (the page is black). Each of those clears its page
// by well over 3:1.
// The fill tone matches the band next to the fill. Black clears steps 0–3
// in light mode and steps 3–6 in dark mode. White clears steps 4–6 in light
// mode and steps 0–2 in dark mode. White is under 3:1 on dark-mode step 3,
// so that step uses black on the fill even though the page tone stays white.
const SELECTED_LIGHT_ENDS =
  "z-10 [box-shadow:inset_0_0_0_2px_#000000,inset_0_0_0_4px_#000000] dark:[box-shadow:inset_0_0_0_2px_#ffffff,inset_0_0_0_4px_#ffffff] contrast-more:[box-shadow:inset_0_0_0_3px_#000000,inset_0_0_0_6px_#000000] dark:contrast-more:[box-shadow:inset_0_0_0_3px_#ffffff,inset_0_0_0_6px_#ffffff]";
const SELECTED_LIGHT_MID =
  "z-10 [box-shadow:inset_0_0_0_2px_#000000,inset_0_0_0_4px_#000000] dark:[box-shadow:inset_0_0_0_2px_#ffffff,inset_0_0_0_4px_#000000] contrast-more:[box-shadow:inset_0_0_0_3px_#000000,inset_0_0_0_6px_#000000] dark:contrast-more:[box-shadow:inset_0_0_0_3px_#ffffff,inset_0_0_0_6px_#000000]";
const SELECTED_SPLIT =
  "z-10 [box-shadow:inset_0_0_0_2px_#000000,inset_0_0_0_4px_#ffffff] dark:[box-shadow:inset_0_0_0_2px_#ffffff,inset_0_0_0_4px_#000000] contrast-more:[box-shadow:inset_0_0_0_3px_#000000,inset_0_0_0_6px_#ffffff] dark:contrast-more:[box-shadow:inset_0_0_0_3px_#ffffff,inset_0_0_0_6px_#000000]";

// Index matches SHADE. 0–2 share one treatment, 3 is its own, 4–6 share one.
const CELL_SELECTED = [
  SELECTED_LIGHT_ENDS,
  SELECTED_LIGHT_ENDS,
  SELECTED_LIGHT_ENDS,
  SELECTED_LIGHT_MID,
  SELECTED_SPLIT,
  SELECTED_SPLIT,
  SELECTED_SPLIT,
];

// Dashed, and outside the cell, so it is not the solid inset selection.
// The ::after border is the 2px band next to the cell, in the fill tone
// (FOCUS_FILL). The outline is the next 2px, in the page tone: black on
// the light page, white on the black page. Offset equals the border width
// so the bands meet. A real outline remains in forced colors, where
// box-shadow is dropped. prefers-contrast: more thickens both bands to 3px.
const CELL_FOCUS = [
  "relative",
  "focus-visible:z-30",
  "focus-visible:outline-2",
  "focus-visible:outline-dashed",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-black",
  "dark:focus-visible:outline-white",
  "focus-visible:forced-colors:[outline-color:CanvasText]",
  "contrast-more:focus-visible:outline-[3px]",
  "contrast-more:focus-visible:outline-offset-[3px]",
  "focus-visible:after:pointer-events-none",
  "focus-visible:after:absolute",
  "focus-visible:after:-inset-[2px]",
  "focus-visible:after:rounded-sm",
  "focus-visible:after:border-2",
  "focus-visible:after:border-dashed",
  "focus-visible:after:content-['']",
  "contrast-more:focus-visible:after:-inset-[3px]",
  "contrast-more:focus-visible:after:border-[3px]",
  "disabled:opacity-60",
].join(" ");

// Fill tone for the focus border. Same split as the inner selection band.
const FOCUS_FILL = [
  "focus-visible:after:border-black dark:focus-visible:after:border-white",
  "focus-visible:after:border-black dark:focus-visible:after:border-white",
  "focus-visible:after:border-black dark:focus-visible:after:border-white",
  "focus-visible:after:border-black",
  "focus-visible:after:border-white dark:focus-visible:after:border-black",
  "focus-visible:after:border-white dark:focus-visible:after:border-black",
  "focus-visible:after:border-white dark:focus-visible:after:border-black",
];

const MARK_FRAME = [
  "pointer-events-none",
  "absolute",
  "top-1/2",
  "left-1/2",
  "h-2",
  "w-2",
  "-translate-x-1/2",
  "-translate-y-1/2",
  "rounded-full",
  "contrast-more:h-2.5",
  "contrast-more:w-2.5",
  "forced-colors:bg-[CanvasText]",
].join(" ");

// Dot color is the fill tone: dark on light steps, light on dark steps.
// Hidden from assistive tech; the button's aria-current is the selection.
const SELECTED_MARK = [
  `${MARK_FRAME} bg-black dark:bg-white`,
  `${MARK_FRAME} bg-black dark:bg-white`,
  `${MARK_FRAME} bg-black dark:bg-white`,
  `${MARK_FRAME} bg-black`,
  `${MARK_FRAME} bg-white dark:bg-black`,
  `${MARK_FRAME} bg-white dark:bg-black`,
  `${MARK_FRAME} bg-white dark:bg-black`,
];

// Forced colors drop box-shadow, so selection is an outline in Highlight,
// pulled inside the cell so the dashed CanvasText focus outline can sit
// outside it. The outline is absent outside forced colors.
const SELECTED_RING =
  "pointer-events-none absolute inset-0 rounded-sm forced-colors:outline-2 forced-colors:outline-solid forced-colors:outline-offset-[-2px] forced-colors:[outline-color:Highlight]";

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
 * Shade step for one cell. Zero stays on the empty step. Any positive count
 * is at least step 1, so a single open restaurant stays off the empty color
 * when another hour is much busier.
 * @param {number} count
 * @param {number} max
 * @returns {number}
 */
function shadeIndex(count, max) {
  if (count <= 0 || max <= 0) return 0;
  const scaled = Math.round((count / max) * (SHADE.length - 1));
  return Math.max(1, Math.min(SHADE.length - 1, scaled));
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
        {/* Padding keeps the outside focus outline inside the scroll box. */}
        <div
          role="group"
          aria-label="Restaurants open by day and hour"
          className="min-w-[46rem] space-y-px p-3"
        >
          <div className="mb-3 grid grid-cols-[3.25rem_repeat(24,minmax(1.75rem,1fr))] gap-px">
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
                const step = shadeIndex(count, maxCount);
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={disabled}
                    aria-label={label}
                    aria-current={selected ? "true" : undefined}
                    title={label}
                    onClick={() => onSelect(day, hour)}
                    className={`h-8 w-full rounded-sm ${CELL_FOCUS} ${FOCUS_FILL[step]} ${SHADE[step]} ${
                      selected ? CELL_SELECTED[step] : ""
                    }`}
                  >
                    {selected ? (
                      <>
                        <span aria-hidden="true" className={SELECTED_RING} />
                        <span aria-hidden="true" className={SELECTED_MARK[step]} />
                      </>
                    ) : null}
                  </button>
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
