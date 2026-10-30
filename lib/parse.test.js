import { describe, expect, it } from "vitest";
import { parseRestaurants, parseScheduleEntry } from "./parse";
import { restaurants } from "./query";

describe("parseScheduleEntry", () => {
  it("parses day ranges, lists, mixed days, and times with or without minutes", () => {
    const ranged = parseScheduleEntry("Mon-Thu 11:30 am - 9 pm", "Range");
    expect(ranged).toHaveLength(4);
    expect(ranged[0]).toEqual({ start: 11 * 60 + 30, end: 21 * 60 });
    expect(ranged[3].start).toBe(3 * 1440 + 11 * 60 + 30);

    const listed = parseScheduleEntry("Mon, Wed-Sun 11 am - 10 pm", "List");
    expect(listed.map((interval) => Math.floor(interval.start / 1440))).toEqual([
      0, 2, 3, 4, 5, 6,
    ]);

    const mixed = parseScheduleEntry("Mon-Thu, Sun 11:30 am - 9 pm", "Mixed");
    expect(mixed.map((interval) => Math.floor(interval.start / 1440))).toEqual([
      0, 1, 2, 3, 6,
    ]);
  });

  it("treats 12 am as midnight and 12 pm as noon", () => {
    const untilMidnight = parseRestaurants([
      { name: "Midnight Close", times: ["Mon 11 am - 12 am"] },
    ]);
    expect(untilMidnight[0].intervals).toEqual([
      { start: 11 * 60, end: 1440 },
    ]);

    const fromMidnight = parseRestaurants([
      { name: "From Midnight", times: ["Tue 12 am - 2 am"] },
    ]);
    expect(fromMidnight[0].intervals).toEqual([
      { start: 1440, end: 1440 + 2 * 60 },
    ]);

    const noon = parseRestaurants([
      { name: "Noon Place", times: ["Sun 12 pm - 1 pm"] },
    ]);
    expect(noon[0].intervals).toEqual([
      { start: 6 * 1440 + 12 * 60, end: 6 * 1440 + 13 * 60 },
    ]);
  });

  it("ends a close at or before open on the next day and splits Sunday into Monday", () => {
    const overnight = parseRestaurants([
      { name: "Late", times: ["Sun 8 pm - 3 am"] },
    ]);
    expect(overnight[0].intervals).toEqual([
      { start: 0, end: 3 * 60 },
      { start: 6 * 1440 + 20 * 60, end: 10080 },
    ]);
  });

  it("parses a single day and a range that wraps past Sunday", () => {
    const single = parseRestaurants([
      { name: "Wednesday Only", times: ["Wed 9 am - 5 pm"] },
    ]);
    expect(single[0].intervals).toEqual([
      { start: 2 * 1440 + 9 * 60, end: 2 * 1440 + 17 * 60 },
    ]);

    const wrapped = parseRestaurants([
      { name: "Wrap", times: ["Sat-Mon 10 am - 2 pm"] },
    ]);
    expect(
      wrapped[0].intervals.map((interval) => Math.floor(interval.start / 1440))
    ).toEqual([0, 5, 6]);
  });

  it("accepts compact and mixed-case clocks", () => {
    const flex = parseRestaurants([
      { name: "Flex", times: ["MON 9AM - 5PM", "tue 9:30am - 10:00pm"] },
    ]);
    expect(flex[0].intervals).toEqual([
      { start: 9 * 60, end: 17 * 60 },
      { start: 1440 + 9 * 60 + 30, end: 1440 + 22 * 60 },
    ]);
  });

  it("merges overlapping intervals", () => {
    const overlap = parseRestaurants([
      {
        name: "Overlap",
        times: ["Mon 9 am - 5 pm", "Mon 4 pm - 8 pm"],
      },
    ]);
    expect(overlap[0].intervals).toEqual([{ start: 9 * 60, end: 20 * 60 }]);
  });

  it("names the restaurant and string for blank or unknown input", () => {
    expect(() => parseRestaurants([{ name: "Blank", times: [""] }])).toThrow(
      /Blank/
    );
    expect(() =>
      parseRestaurants([{ name: "Blank", times: ["   "] }])
    ).toThrow(/Blank:\s+/);
    expect(() =>
      parseScheduleEntry("Funday 9 am - 5 pm", "Unknown")
    ).toThrow(/Unknown: Funday 9 am - 5 pm/);
    expect(() =>
      parseRestaurants([{ name: "Unknown", times: ["Mon 9 am - 5 pm leftover"] }])
    ).toThrow(/Unknown: Mon 9 am - 5 pm leftover/);
    expect(() =>
      parseRestaurants([{ name: "Unknown", times: [null] }])
    ).toThrow(/Unknown/);
    expect(() => parseRestaurants([{ name: "Nope" }])).toThrow(
      /Nope: missing times/
    );
  });
});

describe("dataset", () => {
  it("parses all 51 restaurants with no unparsed segments", () => {
    expect(restaurants).toHaveLength(51);
    expect(new Set(restaurants.map((restaurant) => restaurant.name)).size).toBe(
      51
    );

    for (const restaurant of restaurants) {
      expect(restaurant.rawTimes.length).toBeGreaterThan(0);
      expect(restaurant.intervals.length).toBeGreaterThan(0);
      for (const entry of restaurant.rawTimes) {
        expect(parseScheduleEntry(entry, restaurant.name).length).toBeGreaterThan(
          0
        );
      }
      for (const interval of restaurant.intervals) {
        expect(interval.start).toBeGreaterThanOrEqual(0);
        expect(interval.start).toBeLessThan(interval.end);
        expect(interval.end).toBeLessThanOrEqual(10080);
      }
    }
  });
});
