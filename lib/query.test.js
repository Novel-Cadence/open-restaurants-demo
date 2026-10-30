import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseRestaurants } from "./parse";
import {
  getOpenRestaurantRows,
  getOpenRestaurants,
  minuteOfWeek,
  nowParts,
  resolveQueryParams,
  restaurants,
} from "./query";

const MON = "2026-10-26";
const TUE = "2026-10-27";
const WED = "2026-10-28";
const FRI = "2026-10-30";
const SAT = "2026-10-24";
const SUN = "2026-10-25";

const now = { date: "2026-10-30", time: "15:04" };

describe("minuteOfWeek", () => {
  it("builds the weekday from local calendar parts", () => {
    expect(minuteOfWeek(MON, "01:59")).toBe(1 * 60 + 59);
    expect(minuteOfWeek(SUN, "00:30")).toBe(6 * 1440 + 30);
    expect(minuteOfWeek(WED, "20:59")).toBe(2 * 1440 + 20 * 60 + 59);
    expect(minuteOfWeek(new Date(2026, 9, 26), "09:00")).toBe(9 * 60);

    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "query.js"),
      "utf8"
    );
    expect(source).toContain("new Date(year, monthIndex, day)");
    expect(source).not.toMatch(/new Date\(\s*["'`]/);
  });
});

describe("resolveQueryParams", () => {
  it("keeps valid params and falls back when input is missing or invalid", () => {
    expect(resolveQueryParams("", now)).toEqual(now);
    expect(resolveQueryParams("?date=2026-10-26&time=01:59", now)).toEqual({
      date: MON,
      time: "01:59",
    });
    expect(resolveQueryParams("?date=2026-10-25&time=5:00", now)).toEqual({
      date: SUN,
      time: "05:00",
    });
    expect(resolveQueryParams("?date=nope&time=25:99", now)).toEqual(now);
    expect(resolveQueryParams("?date=2026-02-31&time=09:00", now)).toEqual({
      date: now.date,
      time: "09:00",
    });
    expect(() => resolveQueryParams("?date=<bad>&time=foo", now)).not.toThrow();
  });

  it("reads local clock parts for now", () => {
    expect(nowParts(new Date(2026, 9, 26, 1, 59))).toEqual({
      date: MON,
      time: "01:59",
    });
  });
});

describe("getOpenRestaurants dataset fixtures", () => {
  it("matches Monday overnight boundaries", () => {
    expect(getOpenRestaurants(restaurants, { date: MON, time: "01:59" })).toEqual([
      "Marrakech Moroccan Restaurant",
      "Naan 'N' Curry",
    ]);
    expect(
      getOpenRestaurantRows(restaurants, { date: MON, time: "01:59" })
    ).toEqual([
      { name: "Marrakech Moroccan Restaurant", closesAt: "2 am" },
      { name: "Naan 'N' Curry", closesAt: "4 am" },
    ]);
    expect(getOpenRestaurants(restaurants, { date: MON, time: "02:00" })).toEqual([
      "Naan 'N' Curry",
    ]);
    expect(
      getOpenRestaurants(restaurants, {
        date: new Date(2026, 9, 26),
        time: "01:59",
      })
    ).toEqual(["Marrakech Moroccan Restaurant", "Naan 'N' Curry"]);
  });

  it("matches Sunday early morning, Tuesday morning, and an empty Sunday", () => {
    expect(getOpenRestaurants(restaurants, { date: SUN, time: "00:30" })).toEqual([
      "Marrakech Moroccan Restaurant",
      "Naan 'N' Curry",
      "Sudachi",
      "Thai Stick Restaurant",
    ]);
    expect(getOpenRestaurants(restaurants, { date: TUE, time: "09:00" })).toEqual([
      "Herbivore",
      "Santorini's Mediterranean Cuisine",
      "Tong Palace",
    ]);
    expect(getOpenRestaurants(restaurants, { date: SUN, time: "05:00" })).toEqual(
      []
    );
  });

  it("keeps the real close time when Sunday hours cross midnight", () => {
    const query = { date: SUN, time: "23:00" };
    const minute = minuteOfWeek(query.date, query.time);
    const openByInterval = restaurants
      .filter((restaurant) =>
        restaurant.intervals.some(
          (interval) => interval.start <= minute && minute < interval.end
        )
      )
      .map((restaurant) => restaurant.name)
      .sort((a, b) => a.localeCompare(b, "en"));
    const rows = getOpenRestaurantRows(restaurants, query);
    expect(getOpenRestaurants(restaurants, query)).toEqual(openByInterval);
    expect(rows.map((row) => row.name)).toEqual(openByInterval);
    const closesAt = Object.fromEntries(
      rows.map((row) => [row.name, row.closesAt])
    );
    expect(closesAt["Marrakech Moroccan Restaurant"]).toBe("2 am");
    expect(closesAt["Naan 'N' Curry"]).toBe("4 am");
    expect(closesAt["Thai Stick Restaurant"]).toBe("1 am");
    expect(closesAt.Hanuri).toBe("12 am");
  });

  it("matches the Wednesday, Friday, and Monday counts", () => {
    const wednesdayEvening = getOpenRestaurants(restaurants, {
      date: WED,
      time: "20:59",
    });
    expect(wednesdayEvening).toHaveLength(51);
    expect(new Set(wednesdayEvening)).toEqual(
      new Set(restaurants.map((restaurant) => restaurant.name))
    );

    expect(
      getOpenRestaurants(restaurants, { date: WED, time: "21:00" })
    ).toHaveLength(47);
    expect(
      getOpenRestaurants(restaurants, { date: FRI, time: "23:45" })
    ).toHaveLength(10);
    expect(
      getOpenRestaurants(restaurants, { date: MON, time: "21:00" })
    ).toHaveLength(47);
  });
});

describe("synthetic query cases", () => {
  it("closes at 12 am without staying open past midnight", () => {
    const list = parseRestaurants([
      { name: "Midnight Close", times: ["Mon 11 am - 12 am"] },
    ]);
    expect(getOpenRestaurantRows(list, { date: MON, time: "23:59" })).toEqual([
      { name: "Midnight Close", closesAt: "12 am" },
    ]);
    expect(getOpenRestaurants(list, { date: TUE, time: "00:00" })).toEqual([]);
    expect(getOpenRestaurants(list, { date: MON, time: "10:59" })).toEqual([]);
  });

  it("treats 12 pm as noon", () => {
    const list = parseRestaurants([
      { name: "Noon Place", times: ["Sun 12 pm - 1 pm"] },
    ]);
    expect(getOpenRestaurants(list, { date: SUN, time: "12:00" })).toEqual([
      "Noon Place",
    ]);
    expect(getOpenRestaurants(list, { date: SUN, time: "11:59" })).toEqual([]);
    expect(getOpenRestaurants(list, { date: SUN, time: "13:00" })).toEqual([]);
  });

  it("keeps a single-day spec closed on other days", () => {
    const list = parseRestaurants([
      { name: "Wednesday Only", times: ["Wed 9 am - 5 pm"] },
    ]);
    expect(getOpenRestaurants(list, { date: WED, time: "09:00" })).toEqual([
      "Wednesday Only",
    ]);
    expect(getOpenRestaurants(list, { date: WED, time: "17:00" })).toEqual([]);
    expect(getOpenRestaurants(list, { date: TUE, time: "12:00" })).toEqual([]);
    expect(getOpenRestaurants(list, { date: FRI, time: "12:00" })).toEqual([]);
  });

  it("wraps a Sunday overnight interval into Monday and a Sat-Mon day range", () => {
    const late = parseRestaurants([
      { name: "Late", times: ["Sun 8 pm - 3 am"] },
    ]);
    expect(getOpenRestaurantRows(late, { date: SUN, time: "23:00" })).toEqual([
      { name: "Late", closesAt: "3 am" },
    ]);
    expect(getOpenRestaurants(late, { date: SUN, time: "20:00" })).toEqual([
      "Late",
    ]);
    expect(getOpenRestaurants(late, { date: MON, time: "02:59" })).toEqual([
      "Late",
    ]);
    expect(getOpenRestaurants(late, { date: MON, time: "03:00" })).toEqual([]);

    const wrap = parseRestaurants([
      { name: "Wrap", times: ["Sat-Mon 10 am - 2 pm"] },
    ]);
    expect(getOpenRestaurants(wrap, { date: SAT, time: "10:00" })).toEqual([
      "Wrap",
    ]);
    expect(getOpenRestaurants(wrap, { date: SUN, time: "10:00" })).toEqual([
      "Wrap",
    ]);
    expect(getOpenRestaurants(wrap, { date: MON, time: "10:00" })).toEqual([
      "Wrap",
    ]);
    expect(getOpenRestaurants(wrap, { date: TUE, time: "10:00" })).toEqual([]);
    expect(getOpenRestaurants(wrap, { date: FRI, time: "10:00" })).toEqual([]);
  });
});
