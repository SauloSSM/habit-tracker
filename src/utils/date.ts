export const STREAK_THRESHOLD = 60;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);

  copy.setDate(copy.getDate() + amount);

  return copy;
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date);

  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());

  return copy;
}

export function formatDate(key: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(dateFromKey(key));
}
