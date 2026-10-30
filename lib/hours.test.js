import { describe, expect, it } from "vitest";
import {
  getDayTimeline,
  heatmapCellLabel,
  hourlyOpenCountTable,
  hourlyOpenCounts,
} from "./hours";
import { parseRestaurants } from "./parse";
import {
  getOpenRestaurants,
  nextDateForWeekday,
  restaurants,
  weekdayIndex,
} from "./query";

const MON = "2026-10-26";
const TUE = "2026-10-27";
const WED = "2026-10-28";
const THU = "2026-10-29";
const FRI = "2026-10-30";
const SAT = "2026-10-24";
const SUN = "2026-10-25";

describe("hourlyOpenCounts", () => {
  it("counts restaurants open at the start of each hour", () => {
    const counts = hourlyOpenCounts(restaurants);
    expect(counts).toHaveLength(7);
    const dates = [MON, TUE, WED, THU, FRI, SAT, SUN];
    for (let day = 0; day < 7; day += 1) {
      expect(counts[day]).toHaveLength(24);
      expect(weekdayIndex(dates[day])).toBe(day);
      for (let hour = 0; hour < 24; hour += 1) {
        const time = `${String(hour).padStart(2, "0")}:00`;
        expect(counts[day][hour]).toBe(
          getOpenRestaurants(restaurants, { date: dates[day], time }).length
        );
      }
    }
    expect(hourlyOpenCountTable).toEqual(counts);
  });

  it("is empty for the Sunday 5 am hour and full for the Wednesday 8 pm hour", () => {
    expect(hourlyOpenCountTable[6][5]).toBe(0);
    expect(hourlyOpenCountTable[2][20]).toBe(51);
    expect(
      getOpenRestaurants(restaurants, { date: SUN, time: "05:00" })
    ).toHaveLength(0);
    expect(
      getOpenRestaurants(restaurants, { date: WED, time: "20:00" })
    ).toHaveLength(51);
  });

  it("counts overnight hours on both days and only hours whose start is inside the interval", () => {
    const list = parseRestaurants([
      { name: "Late", times: ["Sun 8 pm - 3 am"] },
      { name: "Half", times: ["Sun 11:30 am - 12:30 pm"] },
      { name: "Nine", times: ["Wed 11 am - 9 pm"] },
    ]);
    const counts = hourlyOpenCounts(list);

    expect(counts[6][19]).toBe(0);
    expect(counts[6][20]).toBe(1);
    expect(counts[6][23]).toBe(1);
    expect(counts[0][0]).toBe(1);
    expect(counts[0][2]).toBe(1);
    expect(counts[0][3]).toBe(0);
    expect(counts[6][11]).toBe(0);
    expect(counts[6][12]).toBe(1);
    expect(counts[2][20]).toBe(1);
    expect(counts[2][21]).toBe(0);
  });

  it("counts a restaurant once when two intervals cover the same hour start", () => {
    const counts = hourlyOpenCounts([
      {
        name: "Overlap",
        intervals: [
          { start: 20 * 60, end: 22 * 60 },
          { start: 21 * 60, end: 23 * 60 },
        ],
        rawTimes: [],
      },
    ]);
    expect(counts[0][20]).toBe(1);
    expect(counts[0][21]).toBe(1);
    expect(counts[0][22]).toBe(1);
    expect(counts[0][23]).toBe(0);
  });
});

describe("heatmapCellLabel", () => {
  it("names the day, hour, and open count", () => {
    expect(heatmapCellLabel(4, 23, 12)).toBe("Fri 11 pm: 12 open");
    expect(heatmapCellLabel(6, 5, 0)).toBe("Sun 5 am: 0 open");
    expect(heatmapCellLabel(2, 20, 51)).toBe("Wed 8 pm: 51 open");
    expect(heatmapCellLabel(0, 0, 2)).toBe("Mon 12 am: 2 open");
    expect(heatmapCellLabel(0, 12, 3)).toBe("Mon 12 pm: 3 open");
  });
});

describe("getDayTimeline", () => {
  it("includes the previous night and clips at midnight", () => {
    const list = parseRestaurants([
      { name: "Late", times: ["Sun 8 pm - 3 am"] },
      { name: "Day", times: ["Mon 9 am - 5 pm"] },
    ]);
    expect(getDayTimeline(list, MON)).toEqual([
      { name: "Day", segments: [{ start: 9 * 60, end: 17 * 60 }] },
      { name: "Late", segments: [{ start: 0, end: 3 * 60 }] },
    ]);
    expect(getDayTimeline(list, SUN)).toEqual([
      { name: "Late", segments: [{ start: 20 * 60, end: 1440 }] },
    ]);
    expect(getDayTimeline(list, TUE)).toEqual([]);
  });

  it("keeps Monday's overnight tail for restaurants that close after midnight", () => {
    const monday = getDayTimeline(restaurants, MON);
    const marrakech = monday.find(
      (row) => row.name === "Marrakech Moroccan Restaurant"
    );
    const naan = monday.find((row) => row.name === "Naan 'N' Curry");
    expect(marrakech?.segments).toEqual([
      { start: 0, end: 2 * 60 },
      { start: 17 * 60 + 30, end: 1440 },
    ]);
    expect(naan?.segments).toEqual([
      { start: 0, end: 4 * 60 },
      { start: 11 * 60, end: 1440 },
    ]);
  });
});

describe("nextDateForWeekday", () => {
  it("stays on the anchor weekday and otherwise moves forward", () => {
    expect(nextDateForWeekday(FRI, 4)).toBe(FRI);
    expect(nextDateForWeekday(FRI, 6)).toBe("2026-11-01");
    expect(nextDateForWeekday(FRI, 2)).toBe("2026-11-04");
    expect(nextDateForWeekday(SUN, 0)).toBe("2026-10-26");
  });
});
