import { useEffect, useState } from "react";
import { loadData, saveData } from "../services/storage";
import type { HabitInput, HabitStatus } from "../types/habit";
import { toDateKey } from "../utils/date";
function createId(): string { return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export function useHabits() {
  const [data, setData] = useState(loadData);
  useEffect(() => saveData(data), [data]);
  function createHabit(input: HabitInput): void { setData((current) => ({ ...current, habits: [...current.habits, { ...input, id: createId(), createdAt: toDateKey(new Date()) }] })); }
  function updateHabit(id: string, input: HabitInput): void { setData((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, ...input } : habit) })); }
  function deleteHabit(id: string): void { setData((current) => ({ habits: current.habits.filter((habit) => habit.id !== id), checkIns: current.checkIns.filter((item) => item.habitId !== id) })); }
  function setStatus(habitId: string, date: string, status?: HabitStatus): void { setData((current) => { const remaining = current.checkIns.filter((item) => item.habitId !== habitId || item.date !== date); return { ...current, checkIns: status ? [...remaining, { habitId, date, status }] : remaining }; }); }
  return { ...data, createHabit, updateHabit, deleteHabit, setStatus };
}
