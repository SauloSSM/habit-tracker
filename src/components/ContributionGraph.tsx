import type { FocusSession, Habit, HabitCheckIn } from "../types/habit";
import { addDays, startOfWeek, toDateKey } from "../utils/date";
import { getConsistencyLevel, getDailyConsistency } from "../utils/consistency";
interface ContributionGraphProps { habits: Habit[]; checkIns: HabitCheckIn[]; focusSessions: FocusSession[]; onSelectDay: (date: string) => void; }
export function ContributionGraph({ habits, checkIns, focusSessions, onSelectDay }: ContributionGraphProps) {
  const weeks = 16; const today = new Date(); const todayKey = toDateKey(today); const firstDay = addDays(startOfWeek(today), -(weeks - 1) * 7);
  const days = Array.from({ length: weeks * 7 }, (_, index) => addDays(firstDay, index));
  return <section className="contribution-section"><div className="section-title"><div><h2>Consistency</h2><p>Small actions leave a record.</p></div><span>Last {weeks} weeks</span></div><div className="graph-wrapper"><div className="contribution-grid">{days.map((date) => { const key = toDateKey(date); const future = key > todayKey; const summary = getDailyConsistency(key, habits, checkIns, focusSessions); const label = `${key}: ${summary.score ?? "rest"}% · ${summary.completed}/${summary.scheduled.length} done`; return <button key={key} type="button" disabled={future} aria-label={label} title={label} onClick={() => onSelectDay(key)} className={`contribution-day level-${future ? 0 : getConsistencyLevel(summary.score)} ${key === todayKey ? "today" : ""} ${future ? "future" : ""}`} />; })}</div></div><div className="graph-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`contribution-day level-${level}`} />)}<span>More</span></div></section>;
}
