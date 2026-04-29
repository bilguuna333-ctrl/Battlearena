export function dailyKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weeklyKey(d: Date = new Date()): string {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const target = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff =
    (date.getTime() - target.getTime()) / 1000 / 60 / 60 / 24;
  const week = 1 + Math.round((diff - 3 + ((target.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function periodKey(period: string, d: Date = new Date()): string {
  return period === "weekly" ? weeklyKey(d) : dailyKey(d);
}
