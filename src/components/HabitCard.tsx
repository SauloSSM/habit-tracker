import type { Habit, HabitStatus } from "../types/habit";
interface HabitCardProps { habit: Habit; status?: HabitStatus; onStatus?: (status?: HabitStatus) => void; onEdit: () => void; onDelete: () => void; }
export function HabitCard({ habit, status, onStatus, onEdit, onDelete }: HabitCardProps) {
  const actions: { status: HabitStatus; label: string }[] = [{ status: "DONE", label: "Done" }, { status: "REST", label: "Rest" }, { status: "MISSED", label: "Missed" }];
  return <article className="habit-card"><div className="habit-copy"><span className="category">{habit.category}</span><h3>{habit.name}</h3>{habit.description && <p>{habit.description}</p>}</div><div className="habit-controls">{onStatus && <div className="status-actions">{actions.map((action) => <button key={action.status} className={status === action.status ? `status-${action.status.toLowerCase()} active` : ""} onClick={() => onStatus(status === action.status ? undefined : action.status)}>{action.label}</button>)}</div>}<div className="card-actions"><button onClick={onEdit}>Edit</button><button className="danger" onClick={onDelete}>Delete</button></div></div></article>;
}
