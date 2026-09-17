import type { HabitStatus } from "../types/habit";
import type { DailyConsistency } from "../utils/consistency";
import { formatDate } from "../utils/date";
interface DayDetailsProps { date: string; summary: DailyConsistency; onClose: () => void; }
export function DayDetails({ date, summary, onClose }: DayDetailsProps) {
  const statusLabel = (status?: HabitStatus): string => status ?? "Not checked";
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="day-modal" role="dialog" aria-modal="true" aria-label={`Details for ${formatDate(date)}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close details">×</button><p className="eyebrow">DAY DETAILS</p><h2>{formatDate(date)}</h2><p className="modal-score">{summary.score === null ? "Planned rest day" : `${summary.score}% consistency`}</p><div className="detail-list">{summary.scheduled.length === 0 ? <p>No habits were scheduled.</p> : summary.scheduled.map((habit) => <div key={habit.id}><span>{habit.name}</span><b className={`detail-${(habit.status ?? "MISSED").toLowerCase()}`}>{statusLabel(habit.status)}</b></div>)}</div><p className="modal-footnote">{summary.completed} done · {summary.resting} rest · {summary.missed} missed</p></section></div>;
}
