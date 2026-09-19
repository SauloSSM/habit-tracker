import { useState } from "react";
import { ContributionGraph } from "./components/ContributionGraph";
import { DayDetails } from "./components/DayDetails";
import { HabitCard } from "./components/HabitCard";
import { HabitForm } from "./components/HabitForm";
import { StatsCard } from "./components/StatsCard";
import { useHabits } from "./hooks/useHabits";
import type { Habit } from "./types/habit";
import { getDailyConsistency, getNextScheduledDate, getStreaks, getWeeklyProgress } from "./utils/consistency";
import { formatDate, toDateKey } from "./utils/date";
import { getCategoryConsistency, getMonthlyStats } from "./utils/statistics";
import "./App.css";

function monthLabel(key: string): string { return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${key}-01T12:00:00`)); }
function shiftMonth(key: string, amount: number): string { const [year, month] = key.split("-").map(Number); return toDateKey(new Date(year, month - 1 + amount, 1)).slice(0, 7); }

function App() {
  const { habits, checkIns, notes, focusSessions, createHabit, updateHabit, deleteHabit, setStatus, archiveHabit, restoreHabit, setNote } = useHabits();
  const [editingHabit, setEditingHabit] = useState<Habit | null | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [month, setMonth] = useState(toDateKey(new Date()).slice(0, 7));
  const today = toDateKey(new Date());
  const activeHabits = habits.filter((habit) => !habit.archived);
  const archivedHabits = habits.filter((habit) => habit.archived);
  const fixedHabits = activeHabits.filter((habit) => habit.scheduleType === "FIXED_DAYS");
  const allFixedHabits = habits.filter((habit) => habit.scheduleType === "FIXED_DAYS");
  const weeklyGoals = activeHabits.filter((habit) => habit.scheduleType === "WEEKLY_TARGET");
  const todaySummary = getDailyConsistency(today, allFixedHabits, checkIns, focusSessions);
  const actionableTodayHabits = todaySummary.scheduled.filter((habit) => !habit.archived);
  const daysRemaining = 6 - new Date().getDay();
  const streaks = getStreaks(habits, checkIns, focusSessions);
  const monthly = getMonthlyStats(month, habits, checkIns, focusSessions);
  const categoryStats = getCategoryConsistency(month, habits, checkIns, focusSessions);
  function removeHabit(habit: Habit): void { if (window.confirm(`Delete “${habit.name}” and its check-ins?`)) deleteHabit(habit.id); }
  function saveHabit(input: Parameters<typeof createHabit>[0]): void { if (editingHabit) updateHabit(editingHabit.id, input); else createHabit(input); setEditingHabit(undefined); }

  return <main className="dashboard">
    <header className="hero"><div><p className="eyebrow">PERSONAL CONSISTENCY LOG</p><h1>Don&apos;t abandon yourself.</h1><p className="subtitle">Today you don&apos;t need to be extraordinary. You just can&apos;t abandon yourself.</p></div><button className="primary-button add-button" onClick={() => setEditingHabit(null)}>+ New habit</button></header>
    <section className="summary" aria-label="Today’s statistics"><StatsCard label="Current streak" value={`${streaks.current} day${streaks.current === 1 ? "" : "s"}`} detail="at least 60% consistency" /><StatsCard label="Longest streak" value={`${streaks.longest} day${streaks.longest === 1 ? "" : "s"}`} detail="your best rhythm" /><StatsCard label="Today" value={todaySummary.score === null ? "Rest" : `${todaySummary.score}%`} detail={`${todaySummary.completed}/${todaySummary.completed + todaySummary.missed} scored`} /></section>
    <ContributionGraph habits={habits} checkIns={checkIns} focusSessions={focusSessions} onSelectDay={setSelectedDate} />
    <section className="today-section"><div className="section-title"><div><h2>Today&apos;s habits</h2><p>Commitments for {formatDate(today)}</p></div><span>{actionableTodayHabits.length} scheduled</span></div>{activeHabits.length === 0 ? <div className="empty-state"><h3>Start with one promise to yourself.</h3><p>Choose a habit and the days you want it to matter.</p><button className="primary-button" onClick={() => setEditingHabit(null)}>Create your first habit</button></div> : actionableTodayHabits.length === 0 ? <div className="empty-state"><h3>Nothing scheduled today.</h3><p>Weekly goals, if any, are listed separately below.</p></div> : <div className="habits">{actionableTodayHabits.map((habit) => <HabitCard key={habit.id} habit={habit} status={habit.status} onStatus={(status) => setStatus(habit.id, today, status)} onEdit={() => setEditingHabit(habit)} onArchive={() => archiveHabit(habit.id)} onDelete={() => removeHabit(habit)} />)}</div>}</section>
    {weeklyGoals.length > 0 && <section className="weekly-section"><div className="section-title"><div><h2>Weekly goals</h2><p>Flexible actions you can complete any day this week.</p></div><span>{daysRemaining === 0 ? "Week ends today" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}</span></div><div className="habits">{weeklyGoals.map((habit) => { const progress = getWeeklyProgress(habit, today, checkIns); const target = habit.weeklyTarget ?? 3; const status = checkIns.find((item) => item.habitId === habit.id && item.date === today)?.status; const remaining = Math.max(0, target - progress); const meta = remaining === 0 ? "Target reached — extra completions still count as a win." : `${remaining} more to reach your target`; return <HabitCard key={habit.id} habit={habit} status={status} weeklyProgress={progress} weeklyMeta={meta} onCompleteToday={() => setStatus(habit.id, today, status === "DONE" ? undefined : "DONE")} onEdit={() => setEditingHabit(habit)} onArchive={() => archiveHabit(habit.id)} onDelete={() => removeHabit(habit)} />; })}</div></section>}
    {fixedHabits.length > 0 && <section className="all-habits"><div className="section-title"><div><h2>Other fixed-day habits</h2><p>Upcoming commitments.</p></div><span>{fixedHabits.length} active</span></div><div className="habits">{fixedHabits.filter((habit) => !todaySummary.scheduled.some((item) => item.id === habit.id)).map((habit) => <div key={habit.id} className="managed-habit"><HabitCard habit={habit} onEdit={() => setEditingHabit(habit)} onArchive={() => archiveHabit(habit.id)} onDelete={() => removeHabit(habit)} /><p className="next-scheduled">Next scheduled: {formatDate(getNextScheduledDate(habit))}</p></div>)}</div></section>}
    <section className="monthly-section"><div className="section-title"><div><h2>Monthly summary</h2><p>{monthLabel(month)}</p></div><div className="month-controls"><button onClick={() => setMonth((value) => shiftMonth(value, -1))}>←</button><button onClick={() => setMonth(toDateKey(new Date()).slice(0, 7))}>Today</button><button onClick={() => setMonth((value) => shiftMonth(value, 1))} disabled={month >= today.slice(0, 7)}>→</button></div></div><div className="monthly-grid"><StatsCard label="Days showed up" value={String(monthly.counts.SHOWED_UP)} detail="1–59%" /><StatsCard label="Good days" value={String(monthly.counts.GOOD)} detail="60–79%" /><StatsCard label="Strong days" value={String(monthly.counts.STRONG)} detail="80–99%" /><StatsCard label="Perfect days" value={String(monthly.counts.PERFECT)} detail="100%" /><StatsCard label="Missed days" value={String(monthly.counts.MISSED)} detail="0%" /><StatsCard label="Average consistency" value={monthly.average === null ? "—" : `${monthly.average}%`} detail={`${monthly.counts.PLANNED_REST} planned rest`} /><StatsCard label="Current streak" value={`${monthly.streaks.current} days`} detail="at least 60%" /><StatsCard label="Longest streak" value={`${monthly.streaks.longest} days`} detail="your best rhythm" /></div><div className="category-stats">{categoryStats.map(({ category, score }) => <div key={category}><span>{category}</span><b>{score === null ? "—" : `${score}%`}</b></div>)}</div></section>
    {archivedHabits.length > 0 && <section className="all-habits archived-section"><button className="archive-toggle" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide" : "View"} archived habits ({archivedHabits.length})</button>{showArchived && <div className="habits">{archivedHabits.map((habit) => <HabitCard key={habit.id} habit={habit} onEdit={() => setEditingHabit(habit)} onRestore={() => restoreHabit(habit.id)} onDelete={() => removeHabit(habit)} />)}</div>}</section>}
    {editingHabit !== undefined && <div className="modal-backdrop" role="presentation"><section className="form-modal" role="dialog" aria-modal="true" aria-label={editingHabit ? "Edit habit" : "Create habit"}><p className="eyebrow">{editingHabit ? "EDIT HABIT" : "NEW HABIT"}</p><h2>{editingHabit ? "Adjust your rhythm" : "Make a small promise"}</h2><HabitForm habit={editingHabit ?? undefined} onSave={saveHabit} onCancel={() => setEditingHabit(undefined)} /></section></div>}
    {selectedDate && <DayDetails date={selectedDate} summary={getDailyConsistency(selectedDate, habits, checkIns, focusSessions)} note={notes.find((note) => note.date === selectedDate)?.text} onSaveNote={(text) => setNote(selectedDate, text)} onClose={() => setSelectedDate(null)} />}
  </main>;
}
export default App;
