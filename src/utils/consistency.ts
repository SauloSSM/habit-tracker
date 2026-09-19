import type { FocusSession, Habit, HabitCheckIn, HabitStatus } from "../types/habit";
import { addDays, dateFromKey, startOfWeek, toDateKey, STREAK_THRESHOLD } from "./date";
import { getDailyFocusMinutes, isFocusHabitFulfilled } from "./focus";

export type DayHabit = Habit & { status?: HabitStatus; weeklyProgress?: number };
export interface DailyConsistency { scheduled: DayHabit[]; completed: number; resting: number; missed: number; score: number | null; isPlannedRest: boolean; }

export function getScheduledHabits(dateKey: string, habits: Habit[]): Habit[] {
  const date = dateFromKey(dateKey);
  return habits.filter((habit) => habit.scheduleType === "FIXED_DAYS" && isHabitRelevantOn(dateKey, habit) && habit.weekdays.includes(date.getDay()));
}

export function isHabitRelevantOn(dateKey: string, habit: Habit): boolean { return habit.createdAt <= dateKey && (!habit.archived || !habit.archivedAt || dateKey <= habit.archivedAt); }
export function getWeekKey(dateKey: string): string { return toDateKey(startOfWeek(dateFromKey(dateKey))); }
export function getWeeklyProgress(habit: Habit, dateKey: string, checkIns: HabitCheckIn[]): number { const start = getWeekKey(dateKey); const end = toDateKey(addDays(dateFromKey(start), 6)); return checkIns.filter((item) => item.habitId === habit.id && item.status === "DONE" && item.date >= start && item.date <= end).length; }

export function getNextScheduledDate(habit: Pick<Habit, "weekdays" | "scheduleType">, from = new Date()): string {
  if (habit.scheduleType === "WEEKLY_TARGET") return toDateKey(from);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(start, offset);
    if (habit.weekdays.includes(candidate.getDay())) return toDateKey(candidate);
  }
  return toDateKey(start);
}

export function getDailyConsistency(
  dateKey: string,
  habits: Habit[],
  checkIns: HabitCheckIn[],
  focusSessions: readonly FocusSession[] = [],
): DailyConsistency {
  const statusByHabit = new Map(checkIns.filter((item) => item.date === dateKey).map((item) => [item.habitId, item.status]));
  const scheduled = getScheduledHabits(dateKey, habits).map((habit): DayHabit => {
    const persistedStatus = statusByHabit.get(habit.id);
    if (habit.trackingType === "CHECK_IN") return { ...habit, status: persistedStatus };
    if (persistedStatus === "REST") return { ...habit, status: "REST" };

    const minutes = getDailyFocusMinutes(focusSessions, habit.id, dateKey);
    const status = isFocusHabitFulfilled(minutes, habit) ? "DONE" : undefined;
    return { ...habit, status };
  });
  let completed = 0; let resting = 0; let total = 0;
  for (const habit of scheduled) {
    if (habit.status === "REST") resting += 1;
    else { total += 1; if (habit.status === "DONE") completed += 1; }
  }
  return { scheduled, completed, resting, missed: Math.max(0, total - completed), score: total === 0 ? null : Math.round((completed / total) * 100), isPlannedRest: scheduled.length > 0 && total === 0 && resting > 0 };
}

export function getConsistencyLevel(score: number | null): number {
  if (score === null || score === 0) return 0;
  if (score <= 25) return 1;
  if (score <= 50) return 2;
  if (score <= 75) return 3;
  return 4;
}

export function getStreaks(
  habits: Habit[],
  checkIns: HabitCheckIn[],
  focusSessions: readonly FocusSession[] = [],
  today = new Date(),
): { current: number; longest: number } {
  const fixedHabits = habits.filter((habit) => habit.scheduleType === "FIXED_DAYS");
  const firstDate = fixedHabits.reduce<string | null>((earliest, habit) => earliest === null || habit.createdAt < earliest ? habit.createdAt : earliest, null);
  if (!firstDate) return { current: 0, longest: 0 };
  let current = 0; let longest = 0; let running = 0; let currentOpen = true;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = toDateKey(cursor);
  while (toDateKey(cursor) >= firstDate) {
    const dateKey = toDateKey(cursor);
    const day = getDailyConsistency(dateKey, fixedHabits, checkIns, focusSessions);
    if (day.scheduled.length === 0 || day.isPlannedRest || day.score === null) { cursor.setDate(cursor.getDate() - 1); continue; }
    if (day.score !== null && day.score >= STREAK_THRESHOLD) { running += 1; if (currentOpen) current += 1; longest = Math.max(longest, running); }
    // Today is still in progress, so only a completed valid day may extend the streak.
    else if (dateKey === todayKey) { cursor.setDate(cursor.getDate() - 1); continue; }
    else { running = 0; currentOpen = false; }
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}
