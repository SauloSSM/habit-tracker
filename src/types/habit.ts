export const HABIT_CATEGORIES = ["Study", "Health", "Personal", "Career", "Other"] as const;
export type HabitCategory = (typeof HABIT_CATEGORIES)[number];
export type HabitStatus = "DONE" | "REST" | "MISSED";
export type ScheduleType = "FIXED_DAYS" | "WEEKLY_TARGET";

export interface Habit {
  id: string; name: string; description: string; category: HabitCategory; weekdays: number[]; scheduleType: ScheduleType; weeklyTarget?: number; createdAt: string; archived: boolean; archivedAt?: string;
}
export interface HabitCheckIn { habitId: string; date: string; status: HabitStatus; }
export interface DayNote { date: string; text: string; }
export interface HabitInput { name: string; description: string; category: HabitCategory; weekdays: number[]; scheduleType: ScheduleType; weeklyTarget?: number; }
