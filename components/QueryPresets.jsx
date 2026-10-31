/**
 * Buttons that jump the query to times on the edges of the weekly schedule.
 * `day` is Monday = 0, the same index as the minute-of-week model.
 */

import { nextDateForWeekday } from "../lib/query";

const PRESETS = [
  // Overnight close: Friday night, still inside hours that run past midnight.
  { label: "Late Friday", day: 4, time: "23:45", detail: "11:45 pm" },
  // Sunday→Monday wrap, one minute before an exclusive closing minute.
  { label: "Monday after midnight", day: 0, time: "01:59", detail: "1:59 am" },
  // Empty hour: no restaurant is open.
  { label: "Early Sunday morning", day: 6, time: "05:00", detail: "5:00 am" },
];

const buttonClassName =
  "h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100";

/**
 * @param {{
 *   date: string | null,
 *   disabled: boolean,
 *   onSelect: (next: { date: string, time: string }) => void,
 * }} props
 */
export default function QueryPresets({ date, disabled, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      <p id="example-times" className="text-sm font-medium">
        Example times
      </p>
      <div
        role="group"
        aria-labelledby="example-times"
        className="flex flex-wrap gap-2"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={disabled || !date}
            onClick={() => {
              if (!date) return;
              onSelect({
                date: nextDateForWeekday(date, preset.day),
                time: preset.time,
              });
            }}
            className={buttonClassName}
          >
            {preset.label}
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              {preset.detail}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
