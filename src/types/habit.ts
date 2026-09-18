export const HABIT_CATEGORIES = ["Study", "Health", "Personal", "Career", "Other"] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];
export type HabitStatus = "DONE" | "REST" | "MISSED";
export type ScheduleType = "FIXED_DAYS" | "WEEKLY_TARGET";
export type HabitTrackingType = "CHECK_IN" | "FOCUS";
export type FocusProgressLevel = "NONE" | "STARTED" | "SHOWED_UP" | "TARGET_REACHED" | "STRETCH_REACHED";
export type FocusTimerState = "RUNNING" | "PAUSED";

interface HabitBase {
  id: string;
  name: string;
  description: string;
  category: HabitCategory;
  weekdays: number[];
  scheduleType: ScheduleType;
  weeklyTarget?: number;
  createdAt: string;
  archived: boolean;
  archivedAt?: string;
}

export interface FocusThresholds {
  minimumMinutes: number;
  targetMinutes: number;
  stretchMinutes?: number;
}

export interface Habit extends HabitBase {
  // Missing trackingType is supported for V1 data and means CHECK_IN.
  trackingType?: HabitTrackingType;
  minimumMinutes?: number;
  targetMinutes?: number;
  stretchMinutes?: number;
}

export interface CheckInHabit extends Habit {
  // Missing trackingType is supported for V1 data and means CHECK_IN.
  trackingType?: "CHECK_IN";
  minimumMinutes?: never;
  targetMinutes?: never;
  stretchMinutes?: never;
}

export interface FocusHabit extends Habit {
  trackingType: "FOCUS";
  minimumMinutes: number;
  targetMinutes: number;
  stretchMinutes?: number;
}

export interface HabitCheckIn {
  habitId: string;
  date: string;
  status: HabitStatus;
}

export interface FocusSession {
  id: string;
  habitId: string;
  date: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  note?: string;
}

export interface ActiveFocusSession {
  id: string;
  habitId: string;
  date: string;
  startedAt: string;
  state: FocusTimerState;
  pausedAt?: string;
  accumulatedPausedSeconds: number;
}

export interface DayNote {
  date: string;
  text: string;
}

type HabitInputBase = Pick<HabitBase, "name" | "description" | "category" | "weekdays" | "scheduleType" | "weeklyTarget">;

export interface CheckInHabitInput extends HabitInputBase {
  trackingType?: "CHECK_IN";
  minimumMinutes?: never;
  targetMinutes?: never;
  stretchMinutes?: never;
}

export interface FocusHabitInput extends HabitInputBase {
  trackingType: "FOCUS";
  minimumMinutes: number;
  targetMinutes: number;
  stretchMinutes?: number;
}

export type HabitInput = CheckInHabitInput | FocusHabitInput;
