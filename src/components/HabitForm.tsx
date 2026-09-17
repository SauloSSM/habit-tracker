import { useState, type FormEvent } from "react";
import { HABIT_CATEGORIES, type Habit, type HabitCategory, type HabitInput } from "../types/habit";
import { getNextScheduledDate } from "../utils/consistency";
import { formatDate } from "../utils/date";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
interface HabitFormProps { habit?: Habit; onSave: (input: HabitInput) => void; onCancel: () => void; }
export function HabitForm({ habit, onSave, onCancel }: HabitFormProps) {
  const today = new Date();
  const todayWeekday = today.getDay();
  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? "Personal");
  const [selectedDays, setSelectedDays] = useState<number[]>(habit?.weekdays ?? [todayWeekday]);
  const hasName = name.trim().length > 0;
  const hasSchedule = selectedDays.length > 0;
  const canSubmit = hasName && hasSchedule;
  const isScheduledToday = selectedDays.includes(todayWeekday);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSubmit) return;
    onSave({ name: name.trim(), description: description.trim(), category, weekdays: selectedDays });
  }

  function toggleDay(day: number): void {
    setSelectedDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day].sort((first, second) => first - second));
  }

  return <form className="habit-form" onSubmit={submit}>
    <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Read 20 minutes" maxLength={60} autoFocus required aria-invalid={!hasName} /></label>
    {!hasName && <p className="form-error" role="alert">Give this habit a name to continue.</p>}
    <label>Description <em>optional</em><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A small note to keep it meaningful" maxLength={160} rows={2} /></label>
    <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as HabitCategory)}>{HABIT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <fieldset aria-describedby={hasSchedule ? undefined : "schedule-error"}><legend>Repeat on</legend><div className="weekday-picker">{weekdays.map((label, day) => <button type="button" aria-pressed={selectedDays.includes(day)} className={selectedDays.includes(day) ? "selected" : ""} onClick={() => toggleDay(day)} key={label}>{label}</button>)}</div></fieldset>
    {!hasSchedule && <p id="schedule-error" className="form-error" role="alert">Select at least one weekday.</p>}
    {hasSchedule && !isScheduledToday && <p className="schedule-note">This habit won&apos;t appear in Today. Next scheduled: {formatDate(getNextScheduledDate({ weekdays: selectedDays }, today))}.</p>}
    <div className="form-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button" disabled={!canSubmit}>{habit ? "Save changes" : "Add habit"}</button></div>
  </form>;
}
