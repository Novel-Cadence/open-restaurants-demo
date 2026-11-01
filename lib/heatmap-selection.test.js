import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WeeklyHeatmap from "../components/WeeklyHeatmap.jsx";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Counts 0–6 with a max of 6 land on shade steps 0–6. Step 0 is the empty
// cell and step 6 is the darkest light-mode fill, the two ends of the scale.
function countsForEveryStep() {
  const day = Array.from({ length: 24 }, (_, hour) => (hour < 7 ? hour : 0));
  return Array.from({ length: 7 }, () => day.slice());
}

/**
 * @param {number} day
 * @param {number} hour
 */
function renderSelected(day, hour) {
  return renderToStaticMarkup(
    createElement(WeeklyHeatmap, {
      counts: countsForEveryStep(),
      dayLabels: DAY_LABELS,
      selectedDay: day,
      selectedHour: hour,
      disabled: false,
      onSelect: () => {},
    })
  );
}

/**
 * @param {string} html
 */
function selectedButton(html) {
  const match = html.match(/<button\b[^>]*aria-current="true"[^>]*>[\s\S]*?<\/button>/);
  expect(match, "selected button").not.toBeNull();
  return match[0];
}

describe("heatmap selection indicator", () => {
  it("marks one cell current and hides the inner mark from assistive tech", () => {
    const html = renderSelected(0, 0);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    const button = selectedButton(html);
    expect(button.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(button).toContain("forced-colors:bg-[CanvasText]");
    expect(button).toContain("forced-colors:[outline-color:Highlight]");
  });

  it("uses the dark fill tone on the empty cell and the light tone on the darkest blue", () => {
    const empty = selectedButton(renderSelected(0, 0));
    expect(empty).toContain(
      "[box-shadow:inset_0_0_0_2px_#000000,inset_0_0_0_4px_#000000]"
    );
    expect(empty).toContain("bg-black");
    expect(empty).toContain("dark:bg-white");

    const busiest = selectedButton(renderSelected(0, 6));
    expect(busiest).toContain(
      "[box-shadow:inset_0_0_0_2px_#000000,inset_0_0_0_4px_#ffffff]"
    );
    expect(busiest).toContain("bg-white");
    expect(busiest).toContain("dark:bg-black");
    expect(busiest).not.toContain("dark:bg-white");
  });

  it("keeps a dashed focus outline on every cell, including the selected one", () => {
    const html = renderSelected(0, 3);
    const buttons = html.match(/<button\b/g);
    const dashed = html.match(/focus-visible:outline-dashed/g);
    expect(buttons.length).toBeGreaterThan(0);
    expect(dashed).toHaveLength(buttons.length);
    expect(selectedButton(html)).toContain("focus-visible:outline-dashed");
    expect(selectedButton(html)).toContain("focus-visible:after:border-black");
  });
});
