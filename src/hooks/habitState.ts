import type { StoredData } from "../services/storage";
import type { Habit, HabitStatus } from "../types/habit";

export function replaceHabitInData(current: StoredData, updatedHabit: Habit): StoredData {
  return {
    ...current,
    habits: current.habits.map((habit) => habit.id === updatedHabit.id ? updatedHabit : habit),
    checkIns: updatedHabit.trackingType === "FOCUS"
      ? current.checkIns.filter((item) => item.habitId !== updatedHabit.id || item.status === "REST")
      : current.checkIns,
  };
}

export function setHabitStatusInData(
  current: StoredData,
  habitId: string,
  date: string,
  status?: HabitStatus,
): StoredData {
  const habit = current.habits.find((item) => item.id === habitId);
  if (!habit) return current;
  if (habit.trackingType === "FOCUS" && status !== undefined && status !== "REST") return current;

  const remaining = current.checkIns.filter((item) => item.habitId !== habitId || item.date !== date);
  return {
    ...current,
    checkIns: status === undefined ? remaining : [...remaining, { habitId, date, status }],
  };
}

export function deleteHabitFromData(current: StoredData, id: string): StoredData {
  return {
    ...current,
    habits: current.habits.filter((habit) => habit.id !== id),
    checkIns: current.checkIns.filter((item) => item.habitId !== id),
    focusSessions: current.focusSessions.filter((session) => session.habitId !== id),
    activeFocusSession: current.activeFocusSession?.habitId === id ? null : current.activeFocusSession,
  };
}

export function archiveHabitInData(current: StoredData, id: string, archivedAt: string): StoredData {
  return {
    ...current,
    habits: current.habits.map((habit) => habit.id === id
      ? { ...habit, archived: true, archivedAt }
      : habit),
    activeFocusSession: current.activeFocusSession?.habitId === id ? null : current.activeFocusSession,
  };
}
