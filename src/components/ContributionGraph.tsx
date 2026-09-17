import type {
  Habit,
  HabitCheckIn,
} from "../types/habit";

import {
  addDays,
  startOfWeek,
  toDateKey,
} from "../utils/date";

interface ContributionGraphProps {
  habits: Habit[];
  checkIns: HabitCheckIn[];
}

function getLevel(
  date: string,
  habits: Habit[],
  checkIns: HabitCheckIn[],
) {
  const dayCheckIns = checkIns.filter(
    (checkIn) => checkIn.date === date,
  );

  const completed = dayCheckIns.filter(
    (checkIn) => checkIn.status === "DONE",
  ).length;

  if (completed === 0) {
    return 0;
  }

  const percentage = completed / habits.length;

  if (percentage <= 0.25) return 1;
  if (percentage <= 0.5) return 2;
  if (percentage <= 0.75) return 3;

  return 4;
}

export function ContributionGraph({
  habits,
  checkIns,
}: ContributionGraphProps) {
  const numberOfWeeks = 16;

  const today = new Date();
  const todayKey = toDateKey(today);

  const currentWeekStart = startOfWeek(today);

  const firstDay = addDays(
    currentWeekStart,
    -(numberOfWeeks - 1) * 7,
  );

  const days = Array.from(
    {
      length: numberOfWeeks * 7,
    },
    (_, index) => addDays(firstDay, index),
  );

  return (
    <section className="contribution-section">
      <div className="section-title">
        <div>
          <h2>Consistency</h2>

          <p className="section-description">
            Keep showing up.
          </p>
        </div>

        <span>Last {numberOfWeeks} weeks</span>
      </div>

      <div className="graph-wrapper">
        <div className="contribution-grid">
          {days.map((date) => {
            const dateKey = toDateKey(date);

            const isFuture = dateKey > todayKey;

            const level = isFuture
              ? 0
              : getLevel(
                  dateKey,
                  habits,
                  checkIns,
                );

            const completed = checkIns.filter(
              (checkIn) =>
                checkIn.date === dateKey &&
                checkIn.status === "DONE",
            ).length;

            return (
              <div
                key={dateKey}
                className={[
                  "contribution-day",
                  `level-${level}`,
                  dateKey === todayKey
                    ? "today"
                    : "",
                  isFuture ? "future" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={`${dateKey} • ${completed}/${habits.length} completed`}
              />
            );
          })}
        </div>
      </div>

      <div className="graph-legend">
        <span>Less</span>

        <div className="contribution-day level-0" />
        <div className="contribution-day level-1" />
        <div className="contribution-day level-2" />
        <div className="contribution-day level-3" />
        <div className="contribution-day level-4" />

        <span>More</span>
      </div>
    </section>
  );
}