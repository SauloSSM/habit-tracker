import type {
  ActiveFocusSession,
  DayNote,
  FocusSession,
  Habit,
  HabitCategory,
  HabitCheckIn,
  ScheduleType,
} from "../types/habit";
import { validateFocusThresholds } from "../utils/focus";

const STORAGE_KEY = "consistency-dashboard-v1";
const VERSION = 4;

export interface StoredData {
  version: number;
  habits: Habit[];
  checkIns: HabitCheckIn[];
  notes: DayNote[];
  focusSessions: FocusSession[];
  activeFocusSession: ActiveFocusSession | null;
}

const categories: HabitCategory[] = ["Study", "Health", "Personal", "Career", "Other"];
const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

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
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = dateKeyPattern.exec(value);
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

function isCheckIn(value: unknown): value is HabitCheckIn {
  return isRecord(value)
    && typeof value.habitId === "string"
    && typeof value.date === "string"
    && (value.status === "DONE" || value.status === "REST" || value.status === "MISSED");
}

function isNote(value: unknown): value is DayNote {
  return isRecord(value) && typeof value.date === "string" && typeof value.text === "string";
}

function migrateHabit(value: unknown): Habit | null {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.name !== "string"
    || typeof value.description !== "string"
    || typeof value.createdAt !== "string"
    || !categories.includes(value.category as HabitCategory)
    || !Array.isArray(value.weekdays)
    || !value.weekdays.every((day) => typeof day === "number")
  ) return null;

  const scheduleType: ScheduleType = value.scheduleType === "WEEKLY_TARGET" ? "WEEKLY_TARGET" : "FIXED_DAYS";
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
    category: value.category as HabitCategory,
    weekdays: value.weekdays as number[],
    scheduleType,
    weeklyTarget: scheduleType === "WEEKLY_TARGET" ? weeklyTarget ?? 3 : undefined,
    createdAt: value.createdAt,
    archived: value.archived === true,
    archivedAt: typeof value.archivedAt === "string" ? value.archivedAt : undefined,
  };

  if (
    value.trackingType === "FOCUS"
    && typeof value.minimumMinutes === "number"
    && typeof value.targetMinutes === "number"
    && (value.stretchMinutes === undefined || typeof value.stretchMinutes === "number")
  ) {
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

  return { ...base, trackingType: "CHECK_IN" };
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

  if (value.state === "PAUSED" && !isTimestamp(value.pausedAt)) return null;

  return {
    id: value.id,
    habitId: value.habitId,
    date: value.date,
    startedAt: value.startedAt,
    state: value.state,
    ...(value.state === "PAUSED" ? { pausedAt: value.pausedAt as string } : {}),
    accumulatedPausedSeconds: value.accumulatedPausedSeconds,
  };
}

export function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createEmptyData();

    const habits = Array.isArray(parsed.habits)
      ? parsed.habits.map(migrateHabit).filter((habit): habit is Habit => habit !== null)
      : [];
    const habitIds = new Set(habits.map((habit) => habit.id));
    const focusSessions = Array.isArray(parsed.focusSessions)
      ? parsed.focusSessions
        .map(parseFocusSession)
        .filter((session): session is FocusSession => session !== null && habitIds.has(session.habitId))
      : [];
    const activeFocusSession = parseActiveFocusSession(parsed.activeFocusSession);

    return {
      version: VERSION,
      habits,
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns.filter(isCheckIn) : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes.filter(isNote) : [],
      focusSessions,
      activeFocusSession: activeFocusSession && habitIds.has(activeFocusSession.habitId)
        ? activeFocusSession
        : null,
    };
  } catch {
    return createEmptyData();
  }
}

export function saveData(data: StoredData): void {
  try {
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
