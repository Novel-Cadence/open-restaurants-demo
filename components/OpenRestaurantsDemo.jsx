/**
 * Page for which restaurants are open, plus the week and day charts.
 * Holds the date and time query: from the URL, or the time at page load, until the user picks one.
 */

"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import AboutPanel from "./AboutPanel";
import DayTimeline from "./DayTimeline";
import QueryPresets from "./QueryPresets";
import WeeklyHeatmap from "./WeeklyHeatmap";
import {
  DAY_LABELS,
  DAY_NAMES,
  getDayTimeline,
  hourlyOpenCountTable,
} from "../lib/hours";
import {
  getOpenRestaurantRows,
  isIsoDate,
  nextDateForWeekday,
  normalizeTime,
  nowParts,
  resolveQueryParams,
  restaurants,
  weekdayIndex,
} from "../lib/query";

/**
 * Writes the query into the address bar. replaceState keeps that URL
 * bookmarkable without a history entry on every change, and skips the write
 * when the URL is already the same.
 * @param {string} date
 * @param {string} time
 */
function writeQueryToUrl(date, time) {
  const url = new URL(window.location.href);
  url.searchParams.set("date", date);
  url.searchParams.set("time", time);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

// Nothing to subscribe to: the snapshot is fixed for the life of the page.
function subscribeNoop() {
  return () => {};
}

// "now" and the URL exist only in the browser. The server snapshot is false
// and the client snapshot is true, so time-dependent output waits for the
// client and the server HTML does not disagree with the first client render.
function useClientReady() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

const fieldClassName =
  "h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 [color-scheme:light] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:[color-scheme:dark] dark:focus-visible:outline-zinc-100";

/**
 * Date and time query with URL-backed state. On load the query comes from the
 * URL's date and time, falling back to the current local time for a missing or
 * invalid value. Picking a time, a preset, a heatmap cell or Now replaces it.
 * The active query is always written back to the URL.
 */
export default function OpenRestaurantsDemo() {
  const ready = useClientReady();
  // null: use the URL query, or the time at page load. Otherwise the user's choice.
  const [override, setOverride] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const query = useMemo(() => {
    if (!ready) return null;
    if (override) return override;
    return resolveQueryParams(window.location.search, nowParts());
  }, [ready, override]);

  useEffect(() => {
    if (!query) return;
    writeQueryToUrl(query.date, query.time);
  }, [query]);

  /**
   * Stores the date and time the user chose (including a Now snapshot) as the active query.
   * @param {{ date: string, time: string }} next
   */
  function commit(next) {
    setOverride(next);
  }

  const rows = query ? getOpenRestaurantRows(restaurants, query) : null;
  const needle = nameFilter.toLowerCase();
  const visibleRows = rows
    ? needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : rows
    : null;
  const selectedDay = query ? weekdayIndex(query.date) : null;
  const selectedHour = query ? Number(query.time.slice(0, 2)) : null;
  const selectedMinutes = query
    ? Number(query.time.slice(0, 2)) * 60 + Number(query.time.slice(3))
    : 0;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Open restaurants finder
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Choose a date and time to see which restaurants are open.
          </p>
        </header>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
            Date
            <input
              type="date"
              name="date"
              value={query?.date ?? ""}
              disabled={!query}
              onChange={(event) => {
                const value = event.target.value;
                if (!query || !isIsoDate(value)) return;
                commit({ date: value, time: query.time });
              }}
              className={fieldClassName}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
            Time
            <input
              type="time"
              name="time"
              value={query?.time ?? ""}
              disabled={!query}
              onChange={(event) => {
                const value = normalizeTime(event.target.value);
                if (!query || !value) return;
                commit({ date: query.date, time: value });
              }}
              className={fieldClassName}
            />
          </label>
          <button
            type="button"
            disabled={!query}
            onClick={() => commit(nowParts())}
            className="h-11 w-full rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100 sm:w-auto"
          >
            Now
          </button>
        </form>

        <QueryPresets
          date={query?.date ?? null}
          disabled={!query}
          onSelect={commit}
        />

        <WeeklyHeatmap
          counts={hourlyOpenCountTable}
          dayLabels={DAY_LABELS}
          selectedDay={selectedDay}
          selectedHour={selectedHour}
          disabled={!query}
          onSelect={(day, hour) => {
            if (!query) return;
            commit({
              date: nextDateForWeekday(query.date, day),
              time: `${String(hour).padStart(2, "0")}:00`,
            });
          }}
        />

        {rows && visibleRows ? (
          <section aria-labelledby="open-count-heading">
            <h2
              id="open-count-heading"
              aria-live="polite"
              className="text-lg font-medium"
            >
              {rows.length} of {restaurants.length} restaurants open
            </h2>
            <label className="mt-3 flex max-w-md flex-col gap-1 text-sm font-medium">
              Filter by name
              <input
                type="search"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Restaurant name"
                autoComplete="off"
                className={fieldClassName}
              />
            </label>
            <div aria-live="polite">
              {rows.length === 0 ? (
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                  No restaurants are open at this time.
                </p>
              ) : visibleRows.length === 0 ? (
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                  No restaurants match that name.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {visibleRows.map((row) => (
                    <li
                      key={row.name}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    >
                      <span className="font-medium">{row.name}</span>
                      <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                        closes at {row.closesAt}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {query ? (
          <DayTimeline
            dayName={DAY_NAMES[weekdayIndex(query.date)]}
            minutes={selectedMinutes}
            rows={getDayTimeline(restaurants, query.date)}
          />
        ) : null}

        <AboutPanel />
      </div>
    </main>
  );
}
