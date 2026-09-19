import { useEffect, useState } from "react";
import { loadData, saveData } from "../services/storage";
import type { Habit, HabitInput, HabitStatus } from "../types/habit";
import { toDateKey } from "../utils/date";
import { archiveHabitInData, deleteHabitFromData, replaceHabitInData, setHabitStatusInData } from "./habitState";
function createId(): string { return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function habitFromInput(input: HabitInput, identity: Pick<Habit, "id" | "createdAt" | "archived" | "archivedAt">): Habit {
  return input.trackingType === "FOCUS"
    ? { ...input, ...identity }
    : { ...input, ...identity, trackingType: "CHECK_IN" };
}

export function useHabits() {
  const [data, setData] = useState(loadData);
  useEffect(() => saveData(data), [data]);
  function createHabit(input: HabitInput): void {
    const identity = { id: createId(), createdAt: toDateKey(new Date()), archived: false };
    const habit = habitFromInput(input, identity);
    setData((current) => ({ ...current, habits: [...current.habits, habit] }));
  }
  function updateHabit(id: string, input: HabitInput): void { setData((current) => { const existing = current.habits.find((habit) => habit.id === id); return existing ? replaceHabitInData(current, habitFromInput(input, existing)) : current; }); }
  function deleteHabit(id: string): void { setData((current) => deleteHabitFromData(current, id)); }
  function setStatus(habitId: string, date: string, status?: HabitStatus): void { setData((current) => setHabitStatusInData(current, habitId, date, status)); }
  function archiveHabit(id: string): void { setData((current) => archiveHabitInData(current, id, toDateKey(new Date()))); }
  function restoreHabit(id: string): void { setData((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, archived: false, archivedAt: undefined } : habit) })); }
  function setNote(date: string, text: string): void { setData((current) => ({ ...current, notes: text.trim() ? [...current.notes.filter((note) => note.date !== date), { date, text: text.trim() }] : current.notes.filter((note) => note.date !== date) })); }
  return { ...data, createHabit, updateHabit, deleteHabit, setStatus, archiveHabit, restoreHabit, setNote };
}
