import { useState } from "react";
import { ContributionGraph } from "./components/ContributionGraph";
import { DayDetails } from "./components/DayDetails";
import { HabitCard } from "./components/HabitCard";
import { HabitForm } from "./components/HabitForm";
import { StatsCard } from "./components/StatsCard";
import { useHabits } from "./hooks/useHabits";
import type { Habit } from "./types/habit";
import { getDailyConsistency, getNextScheduledDate, getStreaks } from "./utils/consistency";
import { formatDate, toDateKey } from "./utils/date";
import "./App.css";

function App() {
  const { habits, checkIns, createHabit, updateHabit, deleteHabit, setStatus } = useHabits();
  const [editingHabit, setEditingHabit] = useState<Habit | null | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const today = toDateKey(new Date());
  const todaySummary = getDailyConsistency(today, habits, checkIns);
  const streaks = getStreaks(habits, checkIns);

  function removeHabit(habit: Habit): void {
    if (window.confirm(`Delete “${habit.name}” and its check-ins?`)) deleteHabit(habit.id);
  }

  return <main className="dashboard">
    <header className="hero"><div><p className="eyebrow">PERSONAL CONSISTENCY LOG</p><h1>Don&apos;t abandon yourself.</h1><p className="subtitle">Today you don&apos;t need to be extraordinary. You just can&apos;t abandon yourself.</p></div><button className="primary-button add-button" onClick={() => setEditingHabit(null)}>+ New habit</button></header>
    {successMessage && <div className="success-message" role="status"><span>{successMessage}</span><button onClick={() => setSuccessMessage(null)} aria-label="Dismiss success message">×</button></div>}
    <section className="summary" aria-label="Today’s statistics"><StatsCard label="Current streak" value={`${streaks.current} day${streaks.current === 1 ? "" : "s"}`} detail="at least 60% consistency" /><StatsCard label="Longest streak" value={`${streaks.longest} day${streaks.longest === 1 ? "" : "s"}`} detail="your best rhythm" /><StatsCard label="Today" value={todaySummary.score === null ? "Rest" : `${todaySummary.score}%`} detail={`${todaySummary.completed}/${todaySummary.scheduled.length} completed`} /></section>
    <ContributionGraph habits={habits} checkIns={checkIns} onSelectDay={setSelectedDate} />
    <section className="today-section"><div className="section-title"><div><h2>Today&apos;s habits</h2><p>{formatDate(today)}</p></div><span>{todaySummary.scheduled.length} scheduled</span></div>{habits.length === 0 ? <div className="empty-state"><h3>Start with one promise to yourself.</h3><p>Choose a habit and the days you want it to matter.</p><button className="primary-button" onClick={() => setEditingHabit(null)}>Create your first habit</button></div> : todaySummary.scheduled.length === 0 ? <div className="empty-state"><h3>Nothing scheduled today.</h3><p>Your habits are taking a well-earned pause. Your full habit list is below.</p></div> : <div className="habits">{todaySummary.scheduled.map((habit) => <HabitCard key={habit.id} habit={habit} status={habit.status} onStatus={(status) => setStatus(habit.id, today, status)} onEdit={() => setEditingHabit(habit)} onDelete={() => removeHabit(habit)} />)}</div>}</section>
    {habits.length > 0 && <section className="all-habits"><div className="section-title"><div><h2>All habits</h2><p>Manage every commitment, not only today&apos;s.</p></div><span>{habits.length} total</span></div><div className="habits">{habits.map((habit) => <div key={habit.id} className="managed-habit"><HabitCard habit={habit} onEdit={() => setEditingHabit(habit)} onDelete={() => removeHabit(habit)} />{!todaySummary.scheduled.some((scheduledHabit) => scheduledHabit.id === habit.id) && <p className="next-scheduled">Next scheduled: {formatDate(getNextScheduledDate(habit))}</p>}</div>)}</div></section>}
    {editingHabit !== undefined && <div className="modal-backdrop" role="presentation"><section className="form-modal" role="dialog" aria-modal="true" aria-label={editingHabit ? "Edit habit" : "Create habit"}><p className="eyebrow">{editingHabit ? "EDIT HABIT" : "NEW HABIT"}</p><h2>{editingHabit ? "Adjust your rhythm" : "Make a small promise"}</h2><HabitForm habit={editingHabit ?? undefined} onSave={(input) => { if (editingHabit) { updateHabit(editingHabit.id, input); } else { createHabit(input); const createdHabit: Habit = { ...input, id: "", createdAt: today }; const scheduledToday = createdHabit.weekdays.includes(new Date().getDay()); setSuccessMessage(scheduledToday ? `“${input.name}” is ready for today.` : `“${input.name}” was created. Next scheduled: ${formatDate(getNextScheduledDate(createdHabit))}.`); } setEditingHabit(undefined); }} onCancel={() => setEditingHabit(undefined)} /></section></div>}
    {selectedDate && <DayDetails date={selectedDate} summary={getDailyConsistency(selectedDate, habits, checkIns)} onClose={() => setSelectedDate(null)} />}
  </main>;
}

export default App;
