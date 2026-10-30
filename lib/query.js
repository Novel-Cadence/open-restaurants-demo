import rawHours from "../data/rest_hours.json";
import { parseRestaurants } from "./parse";

/** @typedef {import("./parse").Restaurant} Restaurant */

export const restaurants = parseRestaurants(rawHours);

const WEEK_MINUTES = 10080;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const local = new Date(year, monthIndex, day);
  return (
    local.getFullYear() === year &&
    local.getMonth() === monthIndex &&
    local.getDate() === day
  );
}

/**
 * @param {unknown} value
 * @returns {string | null} HH:MM
 */
export function normalizeTime(value) {
  if (typeof value !== "string") return null;
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * @param {Date} [clock]
 * @returns {{ date: string, time: string }}
 */
export function nowParts(clock = new Date()) {
  const year = clock.getFullYear();
  const month = String(clock.getMonth() + 1).padStart(2, "0");
  const day = String(clock.getDate()).padStart(2, "0");
  const hours = String(clock.getHours()).padStart(2, "0");
  const minutes = String(clock.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * @param {string} search
 * @param {{ date: string, time: string }} now
 * @returns {{ date: string, time: string }}
 */
export function resolveQueryParams(search, now) {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const dateParam = params.get("date");
  const timeParam = params.get("time");
  const date = dateParam && isIsoDate(dateParam) ? dateParam : now.date;
  const time = normalizeTime(timeParam) ?? now.time;
  return { date, time };
}

/**
 * @param {string | Date} date
 * @param {string} time
 * @returns {number}
 */
export function minuteOfWeek(date, time) {
  let year;
  let monthIndex;
  let day;
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    year = date.getFullYear();
    monthIndex = date.getMonth();
    day = date.getDate();
  } else if (typeof date === "string" && isIsoDate(date)) {
    const match = DATE_RE.exec(date);
    year = Number(match[1]);
    monthIndex = Number(match[2]) - 1;
    day = Number(match[3]);
  } else {
    throw new Error(`Invalid date: ${String(date)}`);
  }

  const local = new Date(year, monthIndex, day);
  const dayIndex = (local.getDay() + 6) % 7;
  const normalized = normalizeTime(time);
  if (!normalized) {
    throw new Error(`Invalid time: ${String(time)}`);
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  return dayIndex * 1440 + hours * 60 + minutes;
}

/**
 * Monday = 0 … Sunday = 6, using the same local calendar parts as minuteOfWeek.
 * @param {string | Date} date
 * @returns {number}
 */
export function weekdayIndex(date) {
  return Math.floor(minuteOfWeek(date, "00:00") / 1440);
}

/**
 * The anchor date when it is already `weekday`, otherwise the next later date
 * with that weekday (Monday = 0 … Sunday = 6).
 * @param {string} anchorDate
 * @param {number} weekday
 * @returns {string}
 */
export function nextDateForWeekday(anchorDate, weekday) {
  if (!isIsoDate(anchorDate)) {
    throw new Error(`Invalid date: ${String(anchorDate)}`);
  }
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error(`Invalid weekday: ${String(weekday)}`);
  }
  const match = DATE_RE.exec(anchorDate);
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const local = new Date(year, monthIndex, day);
  const current = (local.getDay() + 6) % 7;
  const delta = (weekday - current + 7) % 7;
  const next = new Date(year, monthIndex, day + delta);
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const date = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${month}-${date}`;
}

/**
 * @param {number} endMinute
 * @returns {string}
 */
export function formatClock(endMinute) {
  const minute = ((endMinute % WEEK_MINUTES) + WEEK_MINUTES) % 1440;
  let hour = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = hour >= 12 ? "pm" : "am";
  hour %= 12;
  if (hour === 0) hour = 12;
  if (mins === 0) return `${hour} ${suffix}`;
  return `${hour}:${String(mins).padStart(2, "0")} ${suffix}`;
}

/**
 * @param {Restaurant[]} list
 * @param {{ date: string | Date, time: string }} query
 * @returns {{ name: string, closesAt: string }[]}
 */
/**
 * @param {Restaurant} restaurant
 * @param {{ start: number, end: number }} interval
 * @returns {number}
 */
function closingMinute(restaurant, interval) {
  if (interval.end !== WEEK_MINUTES) return interval.end;
  const continuation = restaurant.intervals.find((item) => item.start === 0);
  return continuation ? continuation.end : interval.end;
}

export function getOpenRestaurantRows(list, query) {
  const minute = minuteOfWeek(query.date, query.time);
  return list
    .flatMap((restaurant) => {
      const interval = restaurant.intervals.find(
        (item) => item.start <= minute && minute < item.end
      );
      if (!interval) return [];
      return [
        {
          name: restaurant.name,
          closesAt: formatClock(closingMinute(restaurant, interval)),
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/**
 * @param {Restaurant[]} list
 * @param {{ date: string | Date, time: string }} query
 * @returns {string[]}
 */
export function getOpenRestaurants(list, query) {
  return getOpenRestaurantRows(list, query).map((row) => row.name);
}
