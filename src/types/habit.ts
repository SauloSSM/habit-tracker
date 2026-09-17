export const HABIT_CATEGORIES = ["Study", "Health", "Personal", "Career", "Other"] as const;
export type HabitCategory = (typeof HABIT_CATEGORIES)[number];
export type HabitStatus = "DONE" | "REST" | "MISSED";

export interface Habit {
  id: string; name: string; description: string; category: HabitCategory; weekdays: number[]; createdAt: string;
}
export interface HabitCheckIn { habitId: string; date: string; status: HabitStatus; }
export interface HabitInput { name: string; description: string; category: HabitCategory; weekdays: number[]; }
