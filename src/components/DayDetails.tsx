import { useState } from "react";
import type { HabitStatus } from "../types/habit";
import type { DailyConsistency } from "../utils/consistency";
import { formatDate } from "../utils/date";

interface DayDetailsProps { date: string; summary: DailyConsistency; note?: string; onSaveNote: (text: string) => void; onClose: () => void; }
export function DayDetails({ date, summary, note = "", onSaveNote, onClose }: DayDetailsProps) {
  const [noteText, setNoteText] = useState(note);
  const statusLabel = (status?: HabitStatus): string => status ?? "Not checked";
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="day-modal" role="dialog" aria-modal="true" aria-label={`Details for ${formatDate(date)}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close details">×</button><p className="eyebrow">DAY DETAILS</p><h2>{formatDate(date)}</h2><p className="modal-score">{summary.score === null ? "Planned rest day" : `${summary.score}% consistency`}</p><div className="detail-list">{summary.scheduled.length === 0 ? <p>No habits were scheduled.</p> : summary.scheduled.map((habit) => <div key={habit.id}><span>{habit.name}</span><b className={`detail-${(habit.status ?? "MISSED").toLowerCase()}`}>{habit.scheduleType === "WEEKLY_TARGET" ? `${habit.weeklyProgress ?? 0}/${habit.weeklyTarget ?? 3} this week` : statusLabel(habit.status)}</b></div>)}</div><p className="modal-footnote">{summary.completed} done · {summary.resting} rest · {summary.missed} missed</p><label className="day-note">Daily note<textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={500} rows={3} placeholder="What helped you show up?" /></label><button className="quiet-button note-save" onClick={() => onSaveNote(noteText)}>Save note</button></section></div>;
}
