import { describe, expect, it } from "vitest";
import type { StoredData } from "../services/storage";
import type { ActiveFocusSession, FocusSession, Habit } from "../types/habit";
import { archiveHabitInData, deleteHabitFromData } from "./habitState";

const habit: Habit = {
  id: "habit-1",
  name: "Deep work",
  description: "",
  category: "Career",
  weekdays: [1],
  scheduleType: "FIXED_DAYS",
  createdAt: "2024-01-01",
  archived: false,
  trackingType: "FOCUS",
  minimumMinutes: 15,
  targetMinutes: 45,
};

const focusSession: FocusSession = {
  id: "session-1",
  habitId: habit.id,
  date: "2024-01-02",
  startedAt: "2024-01-02T10:00:00.000Z",
  endedAt: "2024-01-02T10:10:00.000Z",
  durationSeconds: 600,
};

const activeFocusSession: ActiveFocusSession = {
  id: "active-1",
  habitId: habit.id,
  date: "2024-01-02",
  startedAt: "2024-01-02T11:00:00.000Z",
  state: "RUNNING",
  accumulatedPausedSeconds: 0,
};

function data(): StoredData {
  return {
    version: 4,
    habits: [habit],
    checkIns: [{ habitId: habit.id, date: "2024-01-02", status: "DONE" }],
    notes: [{ date: "2024-01-02", text: "Keep going" }],
    focusSessions: [focusSession],
    activeFocusSession,
  };
}

describe("deleteHabitFromData", () => {
  it("removes the habit and all of its completed focus sessions", () => {
    const updated = deleteHabitFromData(data(), habit.id);

    expect(updated.habits).toEqual([]);
    expect(updated.checkIns).toEqual([]);
    expect(updated.focusSessions).toEqual([]);
    expect(updated.notes).toHaveLength(1);
  });

  it("clears an active session belonging to the deleted habit", () => {
    expect(deleteHabitFromData(data(), habit.id).activeFocusSession).toBeNull();
  });
});

describe("archiveHabitInData", () => {
  it("preserves historical focus sessions and check-ins", () => {
    const updated = archiveHabitInData(data(), habit.id, "2024-01-03");

    expect(updated.habits[0]).toMatchObject({ archived: true, archivedAt: "2024-01-03" });
    expect(updated.focusSessions).toEqual([focusSession]);
    expect(updated.checkIns).toHaveLength(1);
  });

  it("clears an active session belonging to the archived habit", () => {
    expect(archiveHabitInData(data(), habit.id, "2024-01-03").activeFocusSession).toBeNull();
  });
});
