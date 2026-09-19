import { describe, expect, it } from "vitest";
import type { FocusHabit, FocusSession, Habit, HabitCheckIn } from "../types/habit";
import { getCategoryConsistency, getMonthlyStats } from "./statistics";

function weeklyHabit(): Habit {
  return {
    id: "weekly",
    name: "Exercise three times",
    description: "",
    category: "Health",
    weekdays: [],
    scheduleType: "WEEKLY_TARGET",
    weeklyTarget: 3,
    createdAt: "2024-01-01",
    archived: false,
    trackingType: "CHECK_IN",
  };
}

describe("daily statistics", () => {
  it("does not let weekly targets affect monthly daily consistency or day quality", () => {
    const weekly = weeklyHabit();
    const checkIns: HabitCheckIn[] = [
      { habitId: weekly.id, date: "2024-01-02", status: "DONE" },
      { habitId: weekly.id, date: "2024-01-04", status: "DONE" },
      { habitId: weekly.id, date: "2024-01-06", status: "DONE" },
    ];

    const stats = getMonthlyStats("2024-01", [weekly], checkIns);

    expect(stats.average).toBeNull();
    expect(stats.counts).toEqual({ MISSED: 0, SHOWED_UP: 0, GOOD: 0, STRONG: 0, PERFECT: 0, PLANNED_REST: 0 });
    expect(stats.streaks).toEqual({ current: 0, longest: 0 });
  });

  it("does not let weekly targets affect category daily consistency", () => {
    const weekly = weeklyHabit();
    const checkIns: HabitCheckIn[] = [{ habitId: weekly.id, date: "2024-01-02", status: "DONE" }];

    const health = getCategoryConsistency("2024-01", [weekly], checkIns).find(({ category }) => category === "Health");

    expect(health).toEqual({ category: "Health", score: null });
  });

  it("derives monthly and category completion from fixed-day Focus sessions", () => {
    const focus: FocusHabit = {
      id: "focus",
      name: "Deep work",
      description: "",
      category: "Career",
      weekdays: [1],
      scheduleType: "FIXED_DAYS",
      createdAt: "2024-01-01",
      archived: true,
      archivedAt: "2024-01-01",
      trackingType: "FOCUS",
      minimumMinutes: 15,
      targetMinutes: 45,
    };
    const sessions: FocusSession[] = [{
      id: "session-1",
      habitId: focus.id,
      date: "2024-01-01",
      startedAt: "2024-01-01T10:00:00.000Z",
      endedAt: "2024-01-01T10:15:00.000Z",
      durationSeconds: 15 * 60,
    }];

    const stats = getMonthlyStats("2024-01", [focus], [], sessions);
    const career = getCategoryConsistency("2024-01", [focus], [], sessions).find(({ category }) => category === "Career");

    expect(stats.average).toBe(100);
    expect(stats.counts.PERFECT).toBe(1);
    expect(career).toEqual({ category: "Career", score: 100 });
  });
});
