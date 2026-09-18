import { describe, expect, it } from "vitest";
import type { Habit, HabitCheckIn } from "../types/habit";
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
});
