// Backend serializes naive-UTC datetimes (no tz suffix). Parse as UTC and
// display in salon-local time (Europe/Moscow).

const TZ = "Europe/Moscow";

export function parseApiDate(s: string): Date {
  // Append Z if the string carries no timezone, so it's read as UTC.
  const hasTz = /[zZ]|[+-]\d\d:?\d\d$/.test(s);
  return new Date(hasTz ? s : `${s}Z`);
}

export function formatDate(s: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parseApiDate(s));
}

export function formatShortDate(s: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(parseApiDate(s));
}

export function formatTime(s: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseApiDate(s));
}

export function formatDateTime(s: string): string {
  return `${formatDate(s)}, ${formatTime(s)}`;
}

export function formatWeekday(s: string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, weekday: "long" }).format(
    parseApiDate(s),
  );
}
