export type HabitStatus = "DONE" | "REST" | "MISSED";

export interface Habit {
  id: string;
  name: string;
}

export interface HabitCheckIn {
  habitId: string;
  date: string;
  status: HabitStatus;
}