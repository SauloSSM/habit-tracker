import {
  HABIT_CATEGORIES,
  type ActiveFocusSession,
  type DayNote,
  type FocusSession,
  type Habit,
  type HabitCategory,
  type HabitCheckIn,
  type ScheduleType,
} from "../types/habit";
import { validateFocusThresholds } from "../utils/focus";

const STORAGE_KEY = "consistency-dashboard-v1";
const VERSION = 4;
type SupportedVersion = 1 | 2 | 3 | 4;

export interface StoredData {
  version: number;
  habits: Habit[];
  checkIns: HabitCheckIn[];
  notes: DayNote[];
  focusSessions: FocusSession[];
  activeFocusSession: ActiveFocusSession | null;
}

export type StoredDataMigrationResult =
  | { kind: "READY"; data: StoredData }
  | { kind: "UNSUPPORTED_FUTURE_VERSION"; version: number };

function createEmptyData(): StoredData {
  return {
    version: VERSION,
    habits: [],
    checkIns: [],
    notes: [],
    focusSessions: [],
    activeFocusSession: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isHabitCategory(value: unknown): value is HabitCategory {
  return typeof value === "string" && HABIT_CATEGORIES.some((category) => category === value);
}

function isScheduleType(value: unknown): value is ScheduleType {
  return value === "FIXED_DAYS" || value === "WEEKLY_TARGET";
}

function parseWeekdays(value: unknown): number[] | null {
  if (
    !Array.isArray(value)
    || !value.every((day) => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6)
  ) return null;

  return new Set(value).size === value.length ? value : null;
}

function parseHabit(value: unknown, version: SupportedVersion): Habit | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || typeof value.name !== "string"
    || typeof value.description !== "string"
    || !isHabitCategory(value.category)
    || !isDateKey(value.createdAt)
    || (value.archivedAt !== undefined && !isDateKey(value.archivedAt))
  ) return null;

  const weekdays = parseWeekdays(value.weekdays);
  if (!weekdays) return null;

  let scheduleType: ScheduleType;
  if (version === 1) scheduleType = "FIXED_DAYS";
  else if (isScheduleType(value.scheduleType)) scheduleType = value.scheduleType;
  else return null;

  const weeklyTarget = typeof value.weeklyTarget === "number"
    && Number.isInteger(value.weeklyTarget)
    && value.weeklyTarget >= 1
    && value.weeklyTarget <= 7
    ? value.weeklyTarget
    : undefined;
  const base = {
    id: value.id,
    name: value.name,
    description: value.description,
    category: value.category,
    weekdays,
    scheduleType,
    weeklyTarget: scheduleType === "WEEKLY_TARGET" ? weeklyTarget ?? 3 : undefined,
    createdAt: value.createdAt,
    archived: value.archived === true,
    archivedAt: value.archivedAt,
  };

  if (version <= 2 || (version === 3 && value.trackingType === undefined) || value.trackingType === "CHECK_IN") {
    return { ...base, trackingType: "CHECK_IN" };
  }

  if (
    value.trackingType !== "FOCUS"
    || typeof value.minimumMinutes !== "number"
    || typeof value.targetMinutes !== "number"
    || (value.stretchMinutes !== undefined && typeof value.stretchMinutes !== "number")
  ) return null;

  const thresholds = {
    minimumMinutes: value.minimumMinutes,
    targetMinutes: value.targetMinutes,
    stretchMinutes: value.stretchMinutes,
  };
  try {
    validateFocusThresholds(thresholds);
    return { ...base, trackingType: "FOCUS", ...thresholds };
  } catch {
    return null;
  }
}

function parseCheckIn(value: unknown): HabitCheckIn | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.habitId)
    || !isDateKey(value.date)
    || (value.status !== "DONE" && value.status !== "REST" && value.status !== "MISSED")
  ) return null;

  return { habitId: value.habitId, date: value.date, status: value.status };
}

function parseNote(value: unknown): DayNote | null {
  if (!isRecord(value) || !isDateKey(value.date) || typeof value.text !== "string") return null;
  return { date: value.date, text: value.text };
}

export function parseFocusSession(value: unknown): FocusSession | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || !isNonEmptyString(value.habitId)
    || !isDateKey(value.date)
    || !isTimestamp(value.startedAt)
    || !isTimestamp(value.endedAt)
    || !isNonNegativeFiniteNumber(value.durationSeconds)
    || (value.note !== undefined && typeof value.note !== "string")
    || Date.parse(value.endedAt) < Date.parse(value.startedAt)
  ) return null;

  return {
    id: value.id,
    habitId: value.habitId,
    date: value.date,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    durationSeconds: value.durationSeconds,
    ...(value.note === undefined ? {} : { note: value.note }),
  };
}

export function parseActiveFocusSession(value: unknown): ActiveFocusSession | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || !isNonEmptyString(value.habitId)
    || !isDateKey(value.date)
    || !isTimestamp(value.startedAt)
    || (value.state !== "RUNNING" && value.state !== "PAUSED")
    || !isNonNegativeFiniteNumber(value.accumulatedPausedSeconds)
  ) return null;

  const common = {
    id: value.id,
    habitId: value.habitId,
    date: value.date,
    startedAt: value.startedAt,
    accumulatedPausedSeconds: value.accumulatedPausedSeconds,
  };
  if (value.state === "PAUSED") {
    return isTimestamp(value.pausedAt) ? { ...common, state: "PAUSED", pausedAt: value.pausedAt } : null;
  }

  return { ...common, state: "RUNNING" };
}

function deduplicateCheckIns(checkIns: HabitCheckIn[]): HabitCheckIn[] {
  const byHabitAndDate = new Map<string, HabitCheckIn>();
  for (const checkIn of checkIns) byHabitAndDate.set(`${checkIn.habitId}\u0000${checkIn.date}`, checkIn);
  return [...byHabitAndDate.values()];
}

function deduplicateNotes(notes: DayNote[]): DayNote[] {
  const byDate = new Map<string, DayNote>();
  for (const note of notes) byDate.set(note.date, note);
  return [...byDate.values()];
}

type VersionResolution =
  | { kind: "SUPPORTED"; version: SupportedVersion }
  | { kind: "UNSUPPORTED_FUTURE"; version: number }
  | { kind: "INVALID" };

function resolveVersion(value: Record<string, unknown>): VersionResolution {
  if (value.version === undefined) return { kind: "SUPPORTED", version: 1 };
  if (typeof value.version !== "number" || !Number.isInteger(value.version)) return { kind: "INVALID" };
  if (value.version > VERSION) return { kind: "UNSUPPORTED_FUTURE", version: value.version };
  if (value.version === 1 || value.version === 2 || value.version === 3 || value.version === 4) {
    return { kind: "SUPPORTED", version: value.version };
  }
  return { kind: "INVALID" };
}

export function migrateStoredData(raw: unknown): StoredDataMigrationResult {
  if (!isRecord(raw)) return { kind: "READY", data: createEmptyData() };

  const resolution = resolveVersion(raw);
  if (resolution.kind === "UNSUPPORTED_FUTURE") {
    return { kind: "UNSUPPORTED_FUTURE_VERSION", version: resolution.version };
  }
  if (resolution.kind === "INVALID") return { kind: "READY", data: createEmptyData() };

  const habits = Array.isArray(raw.habits)
    ? raw.habits.map((habit) => parseHabit(habit, resolution.version)).filter((habit): habit is Habit => habit !== null)
    : [];
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const checkIns = deduplicateCheckIns(Array.isArray(raw.checkIns)
    ? raw.checkIns
      .map(parseCheckIn)
      .filter((checkIn): checkIn is HabitCheckIn => {
        if (!checkIn) return false;
        const habit = habitById.get(checkIn.habitId);
        return habit !== undefined && (habit.trackingType === "CHECK_IN" || checkIn.status === "REST");
      })
    : []);
  const notes = deduplicateNotes(Array.isArray(raw.notes)
    ? raw.notes.map(parseNote).filter((note): note is DayNote => note !== null)
    : []);
  const focusHabitIds = new Set(habits.filter((habit) => habit.trackingType === "FOCUS").map((habit) => habit.id));
  const focusSessions = resolution.version === 4 && Array.isArray(raw.focusSessions)
    ? raw.focusSessions
      .map(parseFocusSession)
      .filter((session): session is FocusSession => session !== null && focusHabitIds.has(session.habitId))
    : [];
  const parsedActiveSession = resolution.version === 4 ? parseActiveFocusSession(raw.activeFocusSession) : null;

  return {
    kind: "READY",
    data: {
      version: VERSION,
      habits,
      checkIns,
      notes,
      focusSessions,
      activeFocusSession: parsedActiveSession && focusHabitIds.has(parsedActiveSession.habitId)
        ? parsedActiveSession
        : null,
    },
  };
}

export function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();

    const parsed: unknown = JSON.parse(raw);
    const result = migrateStoredData(parsed);
    return result.kind === "READY" ? result.data : createEmptyData();
  } catch {
    return createEmptyData();
  }
}

export function saveData(data: StoredData): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      try {
        const parsed: unknown = JSON.parse(existing);
        if (isRecord(parsed) && resolveVersion(parsed).kind === "UNSUPPORTED_FUTURE") return;
      } catch {
        // A malformed existing payload can be safely replaced with normalized current data.
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: VERSION,
      habits: data.habits,
      checkIns: data.checkIns,
      notes: data.notes,
      focusSessions: data.focusSessions,
      activeFocusSession: data.activeFocusSession,
    }));
  } catch {
    // Storage can be unavailable.
  }
}
