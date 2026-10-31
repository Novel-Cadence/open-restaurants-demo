/**
 * Parses hour strings into minute-of-week intervals.
 * Monday 00:00 is minute 0 and a week is 10080 minutes. Open is inclusive
 * and close is exclusive. A day with no listed hours is closed. All times
 * are local.
 */

/**
 * @typedef {{ start: number, end: number }} Interval
 * minutes from Monday 00:00, 0 <= start < end <= 10080
 */

/**
 * @typedef {{ name: string, intervals: Interval[], rawTimes: string[] }} Restaurant
 */

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const MINUTES_PER_DAY = 1440;
/** Minutes from Monday 00:00 through the next Monday 00:00. */
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

const CLOCK_PATTERN = String.raw`(\d{1,2}(?::\d{2})?\s*[ap]m)`;
const ENTRY_RE = new RegExp(
  `^(.+?)\\s+${CLOCK_PATTERN}\\s*-\\s*${CLOCK_PATTERN}$`,
  "i"
);
const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i;

/**
 * @param {string} restaurantName
 * @param {unknown} entry
 */
function unparseable(restaurantName, entry) {
  throw new Error(`Unparseable hours for ${restaurantName}: ${String(entry)}`);
}

/**
 * @param {string} token
 * @returns {number | null}
 */
function dayIndex(token) {
  const index = DAY_ORDER.indexOf(token.toLowerCase());
  return index === -1 ? null : index;
}

/**
 * @param {string} spec
 * @returns {number[] | null}
 */
function parseDaySpec(spec) {
  const tokens = spec.split(",").map((token) => token.trim());
  if (tokens.length === 0 || tokens.some((token) => token.length === 0)) {
    return null;
  }

  /** @type {number[]} */
  const days = [];
  for (const token of tokens) {
    const parts = token.split("-").map((part) => part.trim());
    if (parts.length === 1) {
      const index = dayIndex(parts[0]);
      if (index === null) return null;
      days.push(index);
      continue;
    }
    if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
      return null;
    }
    const start = dayIndex(parts[0]);
    const end = dayIndex(parts[1]);
    if (start === null || end === null) return null;
    // Sat-Mon wraps past Sunday. The guard stops the walk after one week.
    for (let index = start, guard = 0; guard < 7; guard += 1) {
      days.push(index);
      if (index === end) break;
      index = (index + 1) % 7;
    }
  }

  return [...new Set(days)];
}

/**
 * @param {string} text
 * @returns {number | null} minute of day, or null when the clock text is not a time
 */
function parseClock(text) {
  const match = TIME_RE.exec(text.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3].toLowerCase();
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (meridiem === "am") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return hour * 60 + minute;
}

/**
 * @param {Interval[]} intervals
 * @param {number} day
 * @param {number} openMin
 * @param {number} closeMin
 */
function addDayIntervals(intervals, day, openMin, closeMin) {
  const dayStart = day * MINUTES_PER_DAY;
  const start = dayStart + openMin;
  let end;
  // 12 am is minute 0. As a close, that is the end of this day, not its start.
  if (closeMin === 0) {
    end = dayStart + MINUTES_PER_DAY;
  } else if (closeMin <= openMin) {
    // A close at or before the open runs overnight into the next day.
    end = dayStart + MINUTES_PER_DAY + closeMin;
  } else {
    end = dayStart + closeMin;
  }

  if (end <= MINUTES_PER_WEEK) {
    intervals.push({ start, end });
    return;
  }

  // Sunday overnight runs past the week. The end is already past
  // MINUTES_PER_WEEK here, so the leftover starts at Monday 00:00.
  intervals.push({ start, end: MINUTES_PER_WEEK });
  const wrapped = end - MINUTES_PER_WEEK;
  intervals.push({ start: 0, end: wrapped });
}

/**
 * Overlapping or adjacent spans for one restaurant become a single interval.
 * An overnight tail that meets the next day's hours would otherwise leave a
 * seam, and a lookup would report the wrong "closes at" time.
 * @param {Interval[]} intervals
 * @returns {Interval[]}
 */
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );
  /** @type {Interval[]} */
  const merged = [{ start: sorted[0].start, end: sorted[0].end }];
  for (let index = 1; index < sorted.length; index += 1) {
    const last = merged[merged.length - 1];
    const next = sorted[index];
    if (next.start <= last.end) {
      last.end = Math.max(last.end, next.end);
    } else {
      merged.push({ start: next.start, end: next.end });
    }
  }
  return merged;
}

/**
 * One schedule line, such as "Mon-Thu, Sun 11:30 am - 9 pm", as minute-of-week
 * intervals. Days the line does not name are left out, so they stay closed.
 * @param {string} entry
 * @param {string} restaurantName
 * @returns {Interval[]}
 * @throws {Error} when the line is not a day list plus an open-close range
 */
export function parseScheduleEntry(entry, restaurantName) {
  if (typeof entry !== "string") {
    unparseable(restaurantName, entry);
  }
  const raw = entry.trim();
  if (!raw) unparseable(restaurantName, entry);
  const match = ENTRY_RE.exec(raw);
  if (!match) unparseable(restaurantName, entry);
  const days = parseDaySpec(match[1]);
  const openMin = parseClock(match[2]);
  const closeMin = parseClock(match[3]);
  if (!days || days.length === 0 || openMin === null || closeMin === null) {
    unparseable(restaurantName, entry);
  }

  /** @type {Interval[]} */
  const intervals = [];
  for (const day of days) {
    addDayIntervals(intervals, day, openMin, closeMin);
  }
  return intervals;
}

/**
 * Records shaped as { name, times }, each times entry one schedule line.
 * A day that never appears produces no interval and therefore reads as closed.
 * @param {unknown} records
 * @returns {Restaurant[]}
 * @throws {Error} when the list, a record, or a schedule line cannot be parsed
 */
export function parseRestaurants(records) {
  if (!Array.isArray(records)) {
    throw new Error("Unparseable hours for unknown: restaurant list");
  }

  return records.map((record) => {
    const name =
      record && typeof record.name === "string" && record.name.trim()
        ? record.name
        : "unknown";
    if (!record || !Array.isArray(record.times)) {
      throw new Error(`Unparseable hours for ${name}: missing times`);
    }

    /** @type {Interval[]} */
    const intervals = [];
    for (const entry of record.times) {
      intervals.push(...parseScheduleEntry(entry, name));
    }

    return {
      name,
      intervals: mergeIntervals(intervals),
      rawTimes: record.times,
    };
  });
}
