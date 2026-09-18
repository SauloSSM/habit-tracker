import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveFocusSession, FocusSession, Habit } from "../types/habit";
import { loadData, saveData, type StoredData } from "./storage";

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
      focusSessions: undefined,
      activeFocusSession: undefined,
      checkIns: [{ habitId: habit.id, date: "2024-01-02", status: "DONE" }],
      notes: [{ date: "2024-01-02", text: "A note" }],
    });

    const loaded = loadData();

    expect(loaded.version).toBe(4);
    expect(loaded.habits).toHaveLength(1);
    expect(loaded.checkIns).toEqual([{ habitId: habit.id, date: "2024-01-02", status: "DONE" }]);
    expect(loaded.notes).toEqual([{ date: "2024-01-02", text: "A note" }]);
    expect(loaded.focusSessions).toEqual([]);
    expect(loaded.activeFocusSession).toBeNull();
  });

  it("defaults an existing V1 habit to CHECK_IN", () => {
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
});
