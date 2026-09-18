import type { StoredData } from "../services/storage";

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
