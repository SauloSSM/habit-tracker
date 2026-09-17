import { useEffect, useState } from "react";
import { loadData, saveData } from "../services/storage";
import type { HabitInput, HabitStatus } from "../types/habit";
import { toDateKey } from "../utils/date";
function createId(): string { return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export function useHabits() {
  const [data, setData] = useState(loadData);
  useEffect(() => saveData(data), [data]);
  function createHabit(input: HabitInput): void { setData((current) => ({ ...current, habits: [...current.habits, { ...input, id: createId(), createdAt: toDateKey(new Date()), archived: false }] })); }
  function updateHabit(id: string, input: HabitInput): void { setData((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, ...input } : habit) })); }
  function deleteHabit(id: string): void { setData((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id), checkIns: current.checkIns.filter((item) => item.habitId !== id) })); }
  function setStatus(habitId: string, date: string, status?: HabitStatus): void { setData((current) => { const remaining = current.checkIns.filter((item) => item.habitId !== habitId || item.date !== date); return { ...current, checkIns: status ? [...remaining, { habitId, date, status }] : remaining }; }); }
  function archiveHabit(id: string): void { setData((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, archived: true, archivedAt: toDateKey(new Date()) } : habit) })); }
  function restoreHabit(id: string): void { setData((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, archived: false, archivedAt: undefined } : habit) })); }
  function setNote(date: string, text: string): void { setData((current) => ({ ...current, notes: text.trim() ? [...current.notes.filter((note) => note.date !== date), { date, text: text.trim() }] : current.notes.filter((note) => note.date !== date) })); }
  return { ...data, createHabit, updateHabit, deleteHabit, setStatus, archiveHabit, restoreHabit, setNote };
}
