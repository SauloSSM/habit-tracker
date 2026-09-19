import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveFocusSession, CheckInHabit, FocusSession, Habit } from "../types/habit";
import { loadData, migrateStoredData, saveData, type StoredData } from "./storage";

const storageKey = "consistency-dashboard-v1";
let storedValues: Map<string, string>;

const habit: Habit = {
  id: "habit-1",
  name: "Deep work",
  description: "",
  category: "Career",
  weekdays: [1, 2, 3, 4, 5],
  scheduleType: "FIXED_DAYS",
  createdAt: "2024-01-01",
  archived: false,
  trackingType: "FOCUS",
  minimumMinutes: 15,
  targetMinutes: 45,
};

const checkInHabit: CheckInHabit = {
  id: "check-in-1",
  name: "Read",
  description: "",
  category: "Personal",
  weekdays: [1],
  scheduleType: "FIXED_DAYS",
  createdAt: "2024-01-01",
  archived: false,
  trackingType: "CHECK_IN",
};

const focusSession: FocusSession = {
  id: "session-1",
  habitId: habit.id,
  date: "2024-01-02",
  startedAt: "2024-01-01T23:55:00.000Z",
  endedAt: "2024-01-02T00:05:00.000Z",
  durationSeconds: 600,
  note: "Stayed with it",
};

const runningSession: ActiveFocusSession = {
  id: "active-1",
  habitId: habit.id,
  date: "2024-01-02",
  startedAt: "2024-01-02T10:00:00.000Z",
  state: "RUNNING",
  accumulatedPausedSeconds: 0,
};

function storedData(overrides: Partial<StoredData> = {}): StoredData {
  return {
    version: 4,
    habits: [habit],
    checkIns: [],
    notes: [],
    focusSessions: [],
    activeFocusSession: null,
    ...overrides,
  };
}

function writeRaw(overrides: Record<string, unknown> = {}): void {
  storedValues.set(storageKey, JSON.stringify({
    version: 4,
    habits: [habit],
    checkIns: [],
    notes: [],
    focusSessions: [],
    activeFocusSession: null,
    ...overrides,
  }));
}

beforeEach(() => {
  storedValues = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
  });
});

describe("storage migration", () => {
  it("migrates V3 data to V4 with empty focus state without losing existing data", () => {
    writeRaw({
      version: 3,
      habits: [checkInHabit],
      focusSessions: undefined,
      activeFocusSession: undefined,
      checkIns: [{ habitId: checkInHabit.id, date: "2024-01-02", status: "DONE" }],
      notes: [{ date: "2024-01-02", text: "A note" }],
    });

    const loaded = loadData();

    expect(loaded.version).toBe(4);
    expect(loaded.habits).toHaveLength(1);
    expect(loaded.checkIns).toEqual([{ habitId: checkInHabit.id, date: "2024-01-02", status: "DONE" }]);
    expect(loaded.notes).toEqual([{ date: "2024-01-02", text: "A note" }]);
    expect(loaded.focusSessions).toEqual([]);
    expect(loaded.activeFocusSession).toBeNull();
  });

  it("defaults a V2 habit to CHECK_IN", () => {
    writeRaw({
      version: 2,
      habits: [{
        id: "habit-1",
        name: "Read",
        description: "",
        category: "Personal",
        weekdays: [1],
        scheduleType: "FIXED_DAYS",
        createdAt: "2024-01-01",
        archived: false,
      }],
      focusSessions: undefined,
      activeFocusSession: undefined,
    });

    expect(loadData().habits[0]?.trackingType).toBe("CHECK_IN");
  });

  it("defaults a V3 habit with omitted trackingType to CHECK_IN", () => {
    const { trackingType: _trackingType, ...legacyHabit } = checkInHabit;
    writeRaw({ version: 3, habits: [legacyHabit], focusSessions: undefined, activeFocusSession: undefined });

    expect(loadData().habits[0]?.trackingType).toBe("CHECK_IN");
  });

  it("migrates an unversioned V1 payload with legacy schedule and tracking defaults", () => {
    const result = migrateStoredData({
      habits: [{
        id: "legacy-1",
        name: "Walk",
        description: "",
        category: "Health",
        weekdays: [1, 3, 5],
        createdAt: "2024-01-01",
      }],
      checkIns: [{ habitId: "legacy-1", date: "2024-01-03", status: "DONE" }],
    });

    expect(result.kind).toBe("READY");
    if (result.kind !== "READY") throw new Error("Expected supported legacy data");
    expect(result.data).toMatchObject({ version: 4 });
    expect(result.data.habits[0]).toMatchObject({ scheduleType: "FIXED_DAYS", trackingType: "CHECK_IN" });
    expect(result.data.checkIns).toHaveLength(1);
  });

  it("normalizes current V4 data without changing its domain meaning", () => {
    const result = migrateStoredData(storedData({ focusSessions: [focusSession], activeFocusSession: runningSession }));

    expect(result).toEqual({
      kind: "READY",
      data: storedData({ focusSessions: [focusSession], activeFocusSession: runningSession }),
    });
  });

  it("treats a malformed explicit version as invalid data", () => {
    const result = migrateStoredData({ version: "4", habits: [habit] });

    expect(result).toEqual({ kind: "READY", data: storedData({ habits: [] }) });
  });

  it("identifies an unsupported future schema without interpreting it", () => {
    expect(migrateStoredData({ version: 5, habits: [habit], futureField: "preserve me" })).toEqual({
      kind: "UNSUPPORTED_FUTURE_VERSION",
      version: 5,
    });
  });

  it("does not overwrite an unsupported future payload during normal persistence", () => {
    const futurePayload = JSON.stringify({ version: 5, habits: [habit], futureField: "preserve me" });
    storedValues.set(storageKey, futurePayload);

    expect(loadData()).toEqual(storedData({ habits: [] }));
    saveData(storedData({ habits: [] }));

    expect(storedValues.get(storageKey)).toBe(futurePayload);
  });
});

describe("storage validation and normalization", () => {
  it.each([
    ["empty id", { ...checkInHabit, id: "" }],
    ["unknown category", { ...checkInHabit, category: "Unknown" }],
    ["unknown schedule", { ...checkInHabit, scheduleType: "DAILY" }],
    ["unknown tracking type", { ...checkInHabit, trackingType: "TIMER" }],
    ["out-of-range weekday", { ...checkInHabit, weekdays: [7] }],
    ["fractional weekday", { ...checkInHabit, weekdays: [1.5] }],
    ["duplicate weekday", { ...checkInHabit, weekdays: [1, 1] }],
    ["invalid creation date", { ...checkInHabit, createdAt: "2024-02-30" }],
    ["invalid archive date", { ...checkInHabit, archived: true, archivedAt: "not-a-date" }],
    ["invalid Focus thresholds", { ...habit, minimumMinutes: 0 }],
  ])("discards a habit with %s", (_label, invalidHabit) => {
    writeRaw({ habits: [invalidHabit] });

    expect(loadData().habits).toEqual([]);
  });

  it("requires an explicit tracking type in the current schema", () => {
    const { trackingType: _trackingType, ...withoutTrackingType } = checkInHabit;
    writeRaw({ habits: [withoutTrackingType] });

    expect(loadData().habits).toEqual([]);
  });

  it("accepts FOCUS with WEEKLY_TARGET without deriving weekly progress", () => {
    writeRaw({ habits: [{ ...habit, scheduleType: "WEEKLY_TARGET", weekdays: [], weeklyTarget: 3 }] });

    expect(loadData().habits[0]).toMatchObject({ trackingType: "FOCUS", scheduleType: "WEEKLY_TARGET", weeklyTarget: 3 });
  });

  it("discards invalid and orphaned check-ins", () => {
    writeRaw({
      habits: [checkInHabit],
      checkIns: [
        { habitId: checkInHabit.id, date: "not-a-date", status: "DONE" },
        { habitId: "missing", date: "2024-01-02", status: "DONE" },
        { habitId: checkInHabit.id, date: "2024-01-02", status: "SKIPPED" },
      ],
    });

    expect(loadData().checkIns).toEqual([]);
  });

  it("keeps only REST check-ins for Focus habits", () => {
    writeRaw({
      checkIns: [
        { habitId: habit.id, date: "2024-01-01", status: "DONE" },
        { habitId: habit.id, date: "2024-01-02", status: "MISSED" },
        { habitId: habit.id, date: "2024-01-03", status: "REST" },
      ],
    });

    expect(loadData().checkIns).toEqual([{ habitId: habit.id, date: "2024-01-03", status: "REST" }]);
  });

  it("deduplicates check-ins and notes with the last valid occurrence winning", () => {
    writeRaw({
      habits: [checkInHabit],
      checkIns: [
        { habitId: checkInHabit.id, date: "2024-01-02", status: "DONE" },
        { habitId: checkInHabit.id, date: "2024-01-02", status: "REST" },
      ],
      notes: [
        { date: "2024-01-02", text: "First" },
        { date: "2024-01-02", text: "Last" },
      ],
    });

    expect(loadData().checkIns).toEqual([{ habitId: checkInHabit.id, date: "2024-01-02", status: "REST" }]);
    expect(loadData().notes).toEqual([{ date: "2024-01-02", text: "Last" }]);
  });

  it("discards notes with invalid dates", () => {
    writeRaw({ notes: [{ date: "2024-13-01", text: "Invalid" }] });

    expect(loadData().notes).toEqual([]);
  });
});

describe("focus session storage", () => {
  it("persists and reloads a valid session using schema version 4", () => {
    saveData(storedData({ focusSessions: [focusSession] }));

    expect(loadData().focusSessions).toEqual([focusSession]);
    expect(JSON.parse(storedValues.get(storageKey) ?? "{}").version).toBe(4);
  });

  it("discards an invalid session", () => {
    writeRaw({ focusSessions: [{ ...focusSession, id: "" }] });

    expect(loadData().focusSessions).toEqual([]);
  });

  it("discards a session with an invalid timestamp", () => {
    writeRaw({ focusSessions: [{ ...focusSession, startedAt: "not-a-timestamp" }] });

    expect(loadData().focusSessions).toEqual([]);
  });

  it("discards a session with a negative duration", () => {
    writeRaw({ focusSessions: [{ ...focusSession, durationSeconds: -1 }] });

    expect(loadData().focusSessions).toEqual([]);
  });

  it("discards a session whose end is earlier than its start", () => {
    writeRaw({ focusSessions: [{
      ...focusSession,
      startedAt: "2024-01-02T10:00:00.000Z",
      endedAt: "2024-01-02T09:59:59.000Z",
    }] });

    expect(loadData().focusSessions).toEqual([]);
  });

  it("keeps the explicit session date authoritative", () => {
    writeRaw({ focusSessions: [focusSession] });

    expect(loadData().focusSessions[0]?.date).toBe("2024-01-02");
  });

  it("discards a session for a habit that no longer exists", () => {
    writeRaw({ focusSessions: [{ ...focusSession, habitId: "deleted-habit" }] });

    expect(loadData().focusSessions).toEqual([]);
  });

  it("discards a session attached to a CHECK_IN habit", () => {
    writeRaw({ habits: [checkInHabit], focusSessions: [{ ...focusSession, habitId: checkInHabit.id }] });

    expect(loadData().focusSessions).toEqual([]);
  });

  it("retains historical sessions for an archived habit", () => {
    writeRaw({ habits: [{ ...habit, archived: true, archivedAt: "2024-01-03" }], focusSessions: [focusSession] });

    expect(loadData().focusSessions).toEqual([focusSession]);
  });
});

describe("active focus session storage", () => {
  it("reloads a valid RUNNING session and normalizes pausedAt away", () => {
    writeRaw({ activeFocusSession: { ...runningSession, pausedAt: "ignored" } });

    expect(loadData().activeFocusSession).toEqual(runningSession);
  });

  it("reloads a valid PAUSED session", () => {
    const pausedSession: ActiveFocusSession = {
      ...runningSession,
      state: "PAUSED",
      pausedAt: "2024-01-02T10:05:00.000Z",
      accumulatedPausedSeconds: 30,
    };
    writeRaw({ activeFocusSession: pausedSession });

    expect(loadData().activeFocusSession).toEqual(pausedSession);
  });

  it("rejects a PAUSED session without pausedAt", () => {
    writeRaw({ activeFocusSession: { ...runningSession, state: "PAUSED" } });

    expect(loadData().activeFocusSession).toBeNull();
  });

  it("loads an invalid active session as null", () => {
    writeRaw({ activeFocusSession: { ...runningSession, accumulatedPausedSeconds: -1 } });

    expect(loadData().activeFocusSession).toBeNull();
  });

  it("loads an orphaned active session as null", () => {
    writeRaw({ activeFocusSession: { ...runningSession, habitId: "deleted-habit" } });

    expect(loadData().activeFocusSession).toBeNull();
  });

  it("loads an active session for a CHECK_IN habit as null", () => {
    writeRaw({ habits: [checkInHabit], activeFocusSession: { ...runningSession, habitId: checkInHabit.id } });

    expect(loadData().activeFocusSession).toBeNull();
  });
});
