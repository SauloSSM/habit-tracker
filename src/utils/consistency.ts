import type { Habit, HabitCheckIn, HabitStatus } from "../types/habit";
import { dateFromKey, toDateKey, STREAK_THRESHOLD } from "./date";

export interface DayHabit extends Habit { status?: HabitStatus; }
export interface DailyConsistency { scheduled: DayHabit[]; completed: number; resting: number; missed: number; score: number | null; isPlannedRest: boolean; }

export function getScheduledHabits(dateKey: string, habits: Habit[]): Habit[] {
  const date = dateFromKey(dateKey);
  return habits.filter((habit) => habit.createdAt <= dateKey && habit.weekdays.includes(date.getDay()));
}

export function getDailyConsistency(dateKey: string, habits: Habit[], checkIns: HabitCheckIn[]): DailyConsistency {
  const statusByHabit = new Map(checkIns.filter((item) => item.date === dateKey).map((item) => [item.habitId, item.status]));
  const scheduled = getScheduledHabits(dateKey, habits).map((habit) => ({ ...habit, status: statusByHabit.get(habit.id) }));
  const completed = scheduled.filter((habit) => habit.status === "DONE").length;
  const resting = scheduled.filter((habit) => habit.status === "REST").length;
  const activeHabits = scheduled.length - resting;
  return { scheduled, completed, resting, missed: activeHabits - completed, score: activeHabits === 0 ? null : Math.round((completed / activeHabits) * 100), isPlannedRest: scheduled.length > 0 && activeHabits === 0 };
}

export function getConsistencyLevel(score: number | null): number {
  if (score === null || score === 0) return 0;
  if (score <= 25) return 1;
  if (score <= 50) return 2;
  if (score <= 75) return 3;
  return 4;
}

export function getStreaks(habits: Habit[], checkIns: HabitCheckIn[], today = new Date()): { current: number; longest: number } {
  const firstDate = habits.reduce<string | null>((earliest, habit) => earliest === null || habit.createdAt < earliest ? habit.createdAt : earliest, null);
  if (!firstDate) return { current: 0, longest: 0 };
  let current = 0; let longest = 0; let running = 0; let currentOpen = true;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = toDateKey(cursor);
  while (toDateKey(cursor) >= firstDate) {
    const dateKey = toDateKey(cursor);
    const day = getDailyConsistency(dateKey, habits, checkIns);
    if (day.scheduled.length === 0 || day.isPlannedRest) { cursor.setDate(cursor.getDate() - 1); continue; }
    if (day.score !== null && day.score >= STREAK_THRESHOLD) { running += 1; if (currentOpen) current += 1; longest = Math.max(longest, running); }
    // Today is still in progress, so only a completed valid day may extend the streak.
    else if (dateKey === todayKey) { cursor.setDate(cursor.getDate() - 1); continue; }
    else { running = 0; currentOpen = false; }
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}
