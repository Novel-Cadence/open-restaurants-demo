"use client";

import { useEffect, useState } from "react";
import {
  getOpenRestaurantRows,
  isIsoDate,
  normalizeTime,
  nowParts,
  resolveQueryParams,
  restaurants,
} from "../lib/query";

/**
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

const fieldClassName =
  "h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 [color-scheme:light] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:[color-scheme:dark] dark:focus-visible:outline-zinc-100";

export default function OpenRestaurantsDemo() {
  const [query, setQuery] = useState(null);

  useEffect(() => {
    const resolved = resolveQueryParams(window.location.search, nowParts());
    setQuery(resolved);
    writeQueryToUrl(resolved.date, resolved.time);
  }, []);

  /**
   * @param {{ date: string, time: string }} next
   */
  function commit(next) {
    setQuery(next);
    writeQueryToUrl(next.date, next.time);
  }

  const rows = query ? getOpenRestaurantRows(restaurants, query) : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
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

        {rows ? (
          <section aria-live="polite">
            <h2 className="text-lg font-medium">
              {rows.length} of {restaurants.length} restaurants open
            </h2>
            {rows.length === 0 ? (
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                No restaurants are open at this time.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                {rows.map((row) => (
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
          </section>
        ) : null}
      </div>
    </main>
  );
}
