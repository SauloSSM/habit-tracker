import { describe, expect, it } from "vitest";
import type { CheckInHabit, FocusHabit, FocusSession, HabitCheckIn } from "../types/habit";
import { getDailyConsistency, getScheduledHabits, getStreaks, getWeeklyProgress, isHabitRelevantOn } from "./consistency";

function habit(overrides: Partial<CheckInHabit> = {}): CheckInHabit {
  return {
    id: "habit-1",
    name: "Read",
    description: "",
    category: "Personal",
    weekdays: [1],
    scheduleType: "FIXED_DAYS",
    createdAt: "2024-01-01",
    archived: false,
    trackingType: "CHECK_IN",
    ...overrides,
  };
}

function done(habitId: string, date: string): HabitCheckIn {
  return { habitId, date, status: "DONE" };
}

function focusHabit(overrides: Partial<FocusHabit> = {}): FocusHabit {
  return {
    ...habit(),
    id: "focus-1",
    name: "Deep work",
    trackingType: "FOCUS",
    minimumMinutes: 15,
    targetMinutes: 45,
    stretchMinutes: 90,
    ...overrides,
  };
}

function focusSession(durationMinutes: number, overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "session-1",
    habitId: "focus-1",
    date: "2024-01-01",
    startedAt: "2024-01-01T10:00:00.000Z",
    endedAt: "2024-01-01T10:10:00.000Z",
    durationSeconds: durationMinutes * 60,
    ...overrides,
  };
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

  it("keeps an archived habit relevant through its archive date", () => {
    const archivedToday = habit({ archived: true, archivedAt: "2024-01-01" });

    expect(getDailyConsistency("2024-01-01", [archivedToday], [])).toMatchObject({
      scheduled: [expect.objectContaining({ id: archivedToday.id })],
      completed: 0,
      missed: 1,
      score: 0,
    });
  });
});

describe("fixed-day Focus consistency", () => {
  it("does not fulfill below minimum and fulfills exactly at minimum", () => {
    const focus = focusHabit();

    expect(getDailyConsistency("2024-01-01", [focus], [], [focusSession(14)])).toMatchObject({ completed: 0, missed: 1, score: 0 });
    expect(getDailyConsistency("2024-01-01", [focus], [], [focusSession(15)])).toMatchObject({ completed: 1, missed: 0, score: 100 });
  });

  it("accumulates multiple same-day sessions", () => {
    const sessions = [focusSession(8), focusSession(7, { id: "session-2" })];

    expect(getDailyConsistency("2024-01-01", [focusHabit()], [], sessions)).toMatchObject({ completed: 1, missed: 0, score: 100 });
  });

  it("counts target and stretch as only one completion", () => {
    const focus = focusHabit();

    expect(getDailyConsistency("2024-01-01", [focus], [], [focusSession(45)]).completed).toBe(1);
    expect(getDailyConsistency("2024-01-01", [focus], [], [focusSession(120)]).completed).toBe(1);
  });

  it("ignores persisted DONE and MISSED for Focus while allowing REST", () => {
    const focus = focusHabit();

    expect(getDailyConsistency("2024-01-01", [focus], [done(focus.id, "2024-01-01")])).toMatchObject({ completed: 0, missed: 1 });
    expect(getDailyConsistency("2024-01-01", [focus], [{ habitId: focus.id, date: "2024-01-01", status: "MISSED" }])).toMatchObject({ completed: 0, missed: 1 });
    expect(getDailyConsistency("2024-01-01", [focus], [{ habitId: focus.id, date: "2024-01-01", status: "REST" }], [focusSession(90)])).toMatchObject({ completed: 0, resting: 1, missed: 0, score: null });
  });

  it("keeps weekly Focus goals out of daily consistency", () => {
    const weeklyFocus = focusHabit({ scheduleType: "WEEKLY_TARGET", weekdays: [], weeklyTarget: 3 });

    expect(getDailyConsistency("2024-01-01", [weeklyFocus], [], [focusSession(90)])).toMatchObject({
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

    expect(getStreaks(habits, checkIns, [], new Date(2024, 0, 4))).toEqual({ current: 2, longest: 2 });
  });

  it("ignores weekly targets even when they have daily check-ins", () => {
    const weekly = habit({ id: "weekly", scheduleType: "WEEKLY_TARGET", weekdays: [], weeklyTarget: 1 });
    const checkIns = [done(weekly.id, "2024-01-01"), done(weekly.id, "2024-01-02")];

    expect(getStreaks([weekly], checkIns, [], new Date(2024, 0, 3))).toEqual({ current: 0, longest: 0 });
  });

  it("derives fixed-day Focus streaks from sessions", () => {
    const focus = focusHabit({ weekdays: [1, 2] });
    const sessions = [
      focusSession(15),
      focusSession(15, { id: "session-2", date: "2024-01-02" }),
    ];

    expect(getStreaks([focus], [], sessions, new Date(2024, 0, 2))).toEqual({ current: 2, longest: 2 });
  });
});
