import { describe, expect, it } from "vitest";
import type { FocusSession, FocusThresholds } from "../types/habit";
import {
  getDailyFocusMinutes,
  getDailyFocusSeconds,
  getFocusProgressLevel,
  isFocusHabitFulfilled,
  validateFocusThresholds,
} from "./focus";

const thresholds: FocusThresholds = {
  minimumMinutes: 15,
  targetMinutes: 45,
  stretchMinutes: 90,
};

function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "session-1",
    habitId: "habit-1",
    date: "2024-01-01",
    startedAt: "2024-01-01T10:00:00.000Z",
    endedAt: "2024-01-01T10:08:00.000Z",
    durationSeconds: 8 * 60,
    ...overrides,
  };
}

describe("getFocusProgressLevel", () => {
  it.each([
    [0, "NONE"],
    [14, "STARTED"],
    [15, "SHOWED_UP"],
    [30, "SHOWED_UP"],
    [45, "TARGET_REACHED"],
    [60, "TARGET_REACHED"],
    [90, "STRETCH_REACHED"],
    [120, "STRETCH_REACHED"],
  ] as const)("maps %s daily minutes to %s", (minutes, expected) => {
    expect(getFocusProgressLevel(minutes, thresholds)).toBe(expected);
  });

  it("keeps target as the highest level when stretch is undefined", () => {
    const withoutStretch = { minimumMinutes: 15, targetMinutes: 45 };

    expect(getFocusProgressLevel(45, withoutStretch)).toBe("TARGET_REACHED");
    expect(getFocusProgressLevel(120, withoutStretch)).toBe("TARGET_REACHED");
  });
});

describe("daily focus totals", () => {
  it("sums multiple sessions for the same habit and explicit date", () => {
    const sessions = [
      session(),
      session({ id: "session-2", durationSeconds: 12 * 60 }),
    ];

    expect(getDailyFocusSeconds(sessions, "habit-1", "2024-01-01")).toBe(20 * 60);
    expect(getDailyFocusMinutes(sessions, "habit-1", "2024-01-01")).toBe(20);
  });

  it("ignores sessions from another habit", () => {
    const sessions = [session(), session({ id: "session-2", habitId: "habit-2", durationSeconds: 12 * 60 })];

    expect(getDailyFocusMinutes(sessions, "habit-1", "2024-01-01")).toBe(8);
  });

  it("ignores sessions from another explicit date", () => {
    const sessions = [session(), session({ id: "session-2", date: "2024-01-02", durationSeconds: 12 * 60 })];

    expect(getDailyFocusMinutes(sessions, "habit-1", "2024-01-01")).toBe(8);
  });
});

describe("isFocusHabitFulfilled", () => {
  it("is false below minimum", () => {
    expect(isFocusHabitFulfilled(14, thresholds)).toBe(false);
  });

  it("is true exactly at minimum", () => {
    expect(isFocusHabitFulfilled(15, thresholds)).toBe(true);
  });

  it("does not let target or stretch change fulfillment beyond true", () => {
    expect(isFocusHabitFulfilled(45, thresholds)).toBe(true);
    expect(isFocusHabitFulfilled(90, thresholds)).toBe(true);
  });
});

describe("validateFocusThresholds", () => {
  it("accepts valid thresholds, including omitted stretch and equal boundaries", () => {
    expect(() => validateFocusThresholds({ minimumMinutes: 15, targetMinutes: 15 })).not.toThrow();
    expect(() => validateFocusThresholds({ minimumMinutes: 15, targetMinutes: 45, stretchMinutes: 45 })).not.toThrow();
  });

  it.each([
    [{ minimumMinutes: 0, targetMinutes: 45 }, "minimumMinutes"],
    [{ minimumMinutes: 15, targetMinutes: 14 }, "targetMinutes"],
    [{ minimumMinutes: 15, targetMinutes: 45, stretchMinutes: 44 }, "stretchMinutes"],
  ] as const)("rejects invalid thresholds %o", (invalid, field) => {
    expect(() => validateFocusThresholds(invalid)).toThrow(field);
  });
});
