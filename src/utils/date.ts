export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const copy = new Date(date);

  copy.setDate(copy.getDate() + amount);

  return copy;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);

  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());

  return copy;
}