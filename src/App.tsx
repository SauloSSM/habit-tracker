import { useEffect, useState } from "react";
import type { Habit, HabitCheckIn, HabitStatus } from "./types/habit";
import { ContributionGraph } from "./components/ContributionGraph";
import { toDateKey } from "./utils/date";
import "./App.css";

const habits: Habit[] = [
  { id: "java", name: "Java / Spring" },
  { id: "workout", name: "Treino" },
  { id: "reading", name: "Leitura" },
  { id: "no-reels", name: "Sem Reels pela manhã" },
  { id: "project", name: "Projeto / Código" },
];

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function App() {
  const [checkIns, setCheckIns] = useState<HabitCheckIn[]>(() => {
    const saved = localStorage.getItem("habit-checkins");

    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("habit-checkins", JSON.stringify(checkIns));
  }, [checkIns]);

  const today = toDateKey(new Date());

  function getStatus(habitId: string) {
    return checkIns.find(
      (checkIn) =>
        checkIn.habitId === habitId &&
        checkIn.date === today
    )?.status;
  }

  function updateStatus(
    habitId: string,
    status: HabitStatus
  ) {
    setCheckIns((current) => {
      const withoutTodayHabit = current.filter(
        (checkIn) =>
          !(
            checkIn.habitId === habitId &&
            checkIn.date === today
          )
      );

      return [
        ...withoutTodayHabit,
        {
          habitId,
          date: today,
          status,
        },
      ];
    });
  }

  const completed = habits.filter(
    (habit) => getStatus(habit.id) === "DONE"
  ).length;

  const consistency = Math.round(
    (completed / habits.length) * 100
  );

  return (
    <main className="dashboard">
      <header>
        <p className="eyebrow">DAY 1</p>

        <h1>Don't abandon yourself.</h1>

        <p className="subtitle">
          Hoje você não precisa ser extraordinário.
          Só precisa aparecer.
        </p>
      </header>

      <section className="summary">
        <div>
          <span>🔥</span>
          <strong>1</strong>
          <small>day streak</small>
        </div>

        <div>
          <strong>{consistency}%</strong>
          <small>consistency today</small>
        </div>

        <div>
          <strong>
            {completed}/{habits.length}
          </strong>
          <small>completed</small>
        </div>
      </section>

      <ContributionGraph
        habits={habits}
        checkIns={checkIns}
      />

      <section>
        <div className="section-title">
          <h2>Today</h2>
          <span>{today}</span>
        </div>

        <div className="habits">
          {habits.map((habit) => {
            const status = getStatus(habit.id);

            return (
              <article
                key={habit.id}
                className="habit-card"
              >
                <span className="habit-name">
                  {habit.name}
                </span>

                <div className="actions">
                  <button
                    className={
                      status === "DONE"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      updateStatus(
                        habit.id,
                        "DONE"
                      )
                    }
                  >
                    ✓
                  </button>

                  <button
                    className={
                      status === "REST"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      updateStatus(
                        habit.id,
                        "REST"
                      )
                    }
                  >
                    REST
                  </button>

                  <button
                    className={
                      status === "MISSED"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      updateStatus(
                        habit.id,
                        "MISSED"
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;