import type { FocusProgressLevel, FocusSession, FocusThresholds } from "../types/habit";

export function validateFocusThresholds(thresholds: FocusThresholds): void {
  const { minimumMinutes, targetMinutes, stretchMinutes } = thresholds;

  if (!Number.isFinite(minimumMinutes) || minimumMinutes <= 0) {
    throw new RangeError("minimumMinutes must be greater than 0");
  }
  if (!Number.isFinite(targetMinutes) || targetMinutes < minimumMinutes) {
    throw new RangeError("targetMinutes must be greater than or equal to minimumMinutes");
  }
  if (stretchMinutes !== undefined && (!Number.isFinite(stretchMinutes) || stretchMinutes < targetMinutes)) {
    throw new RangeError("stretchMinutes must be greater than or equal to targetMinutes");
  }
}

export function getDailyFocusSeconds(
  sessions: readonly FocusSession[],
  habitId: string,
  date: string,
): number {
  return sessions
    .filter((session) => session.habitId === habitId && session.date === date)
    .reduce((total, session) => total + session.durationSeconds, 0);
}

export function getDailyFocusMinutes(
  sessions: readonly FocusSession[],
  habitId: string,
  date: string,
): number {
  return getDailyFocusSeconds(sessions, habitId, date) / 60;
}

export function getFocusProgressLevel(
  dailyFocusMinutes: number,
  thresholds: FocusThresholds,
): FocusProgressLevel {
  validateFocusThresholds(thresholds);

  if (dailyFocusMinutes <= 0) return "NONE";
  if (dailyFocusMinutes < thresholds.minimumMinutes) return "STARTED";
  if (dailyFocusMinutes < thresholds.targetMinutes) return "SHOWED_UP";
  if (thresholds.stretchMinutes !== undefined && dailyFocusMinutes >= thresholds.stretchMinutes) {
    return "STRETCH_REACHED";
  }
  return "TARGET_REACHED";
}

export function isFocusHabitFulfilled(
  dailyFocusMinutes: number,
  thresholds: FocusThresholds,
): boolean {
  validateFocusThresholds(thresholds);
  return dailyFocusMinutes >= thresholds.minimumMinutes;
}
