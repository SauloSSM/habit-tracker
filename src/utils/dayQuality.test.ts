import { describe, expect, it } from "vitest";
import { getDayQuality } from "./dayQuality";

describe("getDayQuality", () => {
  it.each([
    [null, false, null],
    [null, true, "PLANNED_REST"],
    [0, false, "MISSED"],
    [1, false, "SHOWED_UP"],
    [59, false, "SHOWED_UP"],
    [60, false, "GOOD"],
    [79, false, "GOOD"],
    [80, false, "STRONG"],
    [99, false, "STRONG"],
    [100, false, "PERFECT"],
  ] as const)("maps score %s with planned-rest=%s to %s", (score, isPlannedRest, expected) => {
    expect(getDayQuality(score, isPlannedRest)).toBe(expected);
  });
});
