/**
 * Weekly open-counts and one-day open stretches for the charts.
 * Hour intervals follow the model documented in parse.js.
 */

import { MINUTES_PER_DAY } from "./parse";
import { restaurants, weekdayIndex } from "./query";

/** @typedef {import("./parse").Restaurant} Restaurant */
/** @typedef {import("./parse").Interval} Interval */

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * 12-hour label for one hour of the day, midnight as "12 am".
 * @param {number} hour 0–23
 * @returns {string}
 */
export function formatHourLabel(hour) {
  const suffix = hour < 12 ? "am" : "pm";
  const clock = hour % 12 || 12;
  return `${clock} ${suffix}`;
}

/**
 * Accessible name for one heatmap cell: the day, the hour, and the open count.
 * @param {number} dayIndex Monday = 0
 * @param {number} hour
 * @param {number} count
 * @returns {string}
 */
export function heatmapCellLabel(dayIndex, hour, count) {
  return `${DAY_LABELS[dayIndex]} ${formatHourLabel(hour)}: ${count} open`;
}

/**
 * Restaurants open at the start of each hour. `counts[day][hour]`, Monday = 0.
 * A restaurant counts once even if more than one interval covers that instant.
 * @param {Restaurant[]} list
 * @returns {number[][]}
 */
export function hourlyOpenCounts(list) {
  /** @type {number[][]} */
  const counts = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const restaurant of list) {
    /** @type {boolean[][]} */
    const open = Array.from({ length: 7 }, () => Array(24).fill(false));
    for (const interval of restaurant.intervals) {
      markHourStarts(open, interval);
    }
    for (let day = 0; day < 7; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        if (open[day][hour]) counts[day][hour] += 1;
      }
    }
  }

  return counts;
}

/**
 * Marks each hour whose start falls inside the interval.
 * @param {boolean[][]} open
 * @param {Interval} interval
 */
function markHourStarts(open, interval) {
  // First hour boundary at or after the open, so 11:30 does not count 11:00.
  let hourIndex = Math.ceil(interval.start / 60);
  while (hourIndex * 60 < interval.end) {
    const day = Math.floor(hourIndex / 24);
    // Past Sunday the Monday tail is a separate interval that starts at 0.
    if (day > 6) break;
    open[day][hourIndex % 24] = true;
    hourIndex += 1;
  }
}

/** Precomputed from the bundled dataset for the weekly heatmap. */
export const hourlyOpenCountTable = hourlyOpenCounts(restaurants);

/**
 * Open stretches on the calendar day, clipped to local midnight–midnight.
 * Includes the tail of an interval that started the previous night.
 * @param {Restaurant[]} list
 * @param {string | Date} date
 * @returns {{ name: string, segments: { start: number, end: number }[] }[]}
 */
export function getDayTimeline(list, date) {
  const day = weekdayIndex(date);
  const dayStart = day * MINUTES_PER_DAY;
  const dayEnd = dayStart + MINUTES_PER_DAY;

  return list
    .flatMap((restaurant) => {
      const segments = restaurant.intervals
        .map((interval) => {
          const start = Math.max(interval.start, dayStart);
          const end = Math.min(interval.end, dayEnd);
          if (start >= end) return null;
          return { start: start - dayStart, end: end - dayStart };
        })
        .filter((segment) => segment !== null)
        .sort((a, b) => a.start - b.start || a.end - b.end);
      if (segments.length === 0) return [];
      return [{ name: restaurant.name, segments }];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
