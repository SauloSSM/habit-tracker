import { useState, type FormEvent } from "react";
import { HABIT_CATEGORIES, type Habit, type HabitCategory, type HabitInput } from "../types/habit";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
interface HabitFormProps { habit?: Habit; onSave: (input: HabitInput) => void; onCancel: () => void; }
export function HabitForm({ habit, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? "Personal");
  const [selectedDays, setSelectedDays] = useState<number[]>(habit?.weekdays ?? [1, 2, 3, 4, 5]);
  function submit(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); if (!name.trim() || selectedDays.length === 0) return; onSave({ name: name.trim(), description: description.trim(), category, weekdays: selectedDays }); }
  function toggleDay(day: number): void { setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()); }
  return <form className="habit-form" onSubmit={submit}>
    <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Read 20 minutes" maxLength={60} autoFocus required /></label>
    <label>Description <em>optional</em><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A small note to keep it meaningful" maxLength={160} rows={2} /></label>
    <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as HabitCategory)}>{HABIT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <fieldset><legend>Repeat on</legend><div className="weekday-picker">{weekdays.map((label, day) => <button type="button" aria-pressed={selectedDays.includes(day)} className={selectedDays.includes(day) ? "selected" : ""} onClick={() => toggleDay(day)} key={label}>{label}</button>)}</div></fieldset>
    <div className="form-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancel</button><button className="primary-button">{habit ? "Save changes" : "Add habit"}</button></div>
  </form>;
}
