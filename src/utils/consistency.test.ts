import { describe, expect, it } from "vitest";
import type { Habit, HabitCheckIn } from "../types/habit";
import { getDailyConsistency, getScheduledHabits, getStreaks, getWeeklyProgress, isHabitRelevantOn } from "./consistency";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "habit-1",
    name: "Read",
    description: "",
    category: "Personal",
    weekdays: [1],
    scheduleType: "FIXED_DAYS",
    createdAt: "2024-01-01",
    archived: false,
    ...overrides,
  };
}

function done(habitId: string, date: string): HabitCheckIn {
  return { habitId, date, status: "DONE" };
}

describe("fixed-day daily consistency", () => {
  it("scores only fixed-day habits scheduled for the requested weekday", () => {
    const mondayHabit = habit();
    const tuesdayHabit = habit({ id: "habit-2", weekdays: [2] });
    const summary = getDailyConsistency("2024-01-01", [mondayHabit, tuesdayHabit], [done(mondayHabit.id, "2024-01-01")]);

    expect(summary.scheduled.map(({ id }) => id)).toEqual([mondayHabit.id]);
    expect(summary).toMatchObject({ completed: 1, missed: 0, resting: 0, score: 100, isPlannedRest: false });
  });

  it("excludes REST from the denominator and recognizes an all-rest planned day", () => {
    const first = habit();
    const second = habit({ id: "habit-2" });
    const mixed = getDailyConsistency("2024-01-01", [first, second], [
      { habitId: first.id, date: "2024-01-01", status: "REST" },
      done(second.id, "2024-01-01"),
    ]);
    const plannedRest = getDailyConsistency("2024-01-01", [first], [
      { habitId: first.id, date: "2024-01-01", status: "REST" },
    ]);

    expect(mixed).toMatchObject({ completed: 1, missed: 0, resting: 1, score: 100, isPlannedRest: false });
    expect(plannedRest).toMatchObject({ completed: 0, missed: 0, resting: 1, score: null, isPlannedRest: true });
  });

  it("never schedules or scores weekly targets in daily consistency", () => {
    const weekly = habit({ id: "weekly", scheduleType: "WEEKLY_TARGET", weekdays: [], weeklyTarget: 1 });
    const checkIns = [done(weekly.id, "2024-01-01")];

    expect(getScheduledHabits("2024-01-01", [weekly])).toEqual([]);
    expect(getDailyConsistency("2024-01-01", [weekly], checkIns)).toMatchObject({
      scheduled: [], completed: 0, missed: 0, score: null,
    });
  });
});

describe("weekly target progress", () => {
  it("counts only DONE check-ins within the Sunday-to-Saturday week", () => {
    const weekly = habit({ id: "weekly", scheduleType: "WEEKLY_TARGET", weekdays: [], weeklyTarget: 3 });
    const checkIns: HabitCheckIn[] = [
      done(weekly.id, "2024-01-06"),
      done(weekly.id, "2024-01-07"),
      done(weekly.id, "2024-01-10"),
      { habitId: weekly.id, date: "2024-01-11", status: "REST" },
      done(weekly.id, "2024-01-13"),
      done(weekly.id, "2024-01-14"),
    ];

    expect(getWeeklyProgress(weekly, "2024-01-10", checkIns)).toBe(3);
  });
});

describe("habit relevance", () => {
  it("starts on creation and keeps an archived habit relevant through its archive date", () => {
    const archived = habit({ createdAt: "2024-01-02", archived: true, archivedAt: "2024-01-08" });

    expect(isHabitRelevantOn("2024-01-01", archived)).toBe(false);
    expect(isHabitRelevantOn("2024-01-02", archived)).toBe(true);
    expect(isHabitRelevantOn("2024-01-08", archived)).toBe(true);
    expect(isHabitRelevantOn("2024-01-09", archived)).toBe(false);
  });
});

describe("streaks", () => {
  it("uses the 60% threshold and leaves an unfinished current day open", () => {
    const habits = Array.from({ length: 5 }, (_, index) => habit({ id: `habit-${index + 1}`, weekdays: [1, 2, 3, 4] }));
    const checkIns = [
      ...habits.slice(0, 2).map(({ id }) => done(id, "2024-01-01")),
      ...habits.slice(0, 3).map(({ id }) => done(id, "2024-01-02")),
      ...habits.slice(0, 3).map(({ id }) => done(id, "2024-01-03")),
    ];

    expect(getStreaks(habits, checkIns, new Date(2024, 0, 4))).toEqual({ current: 2, longest: 2 });
  });

  it("ignores weekly targets even when they have daily check-ins", () => {
    const weekly = habit({ id: "weekly", scheduleType: "WEEKLY_TARGET", weekdays: [], weeklyTarget: 1 });
    const checkIns = [done(weekly.id, "2024-01-01"), done(weekly.id, "2024-01-02")];

    expect(getStreaks([weekly], checkIns, new Date(2024, 0, 3))).toEqual({ current: 0, longest: 0 });
  });
});
