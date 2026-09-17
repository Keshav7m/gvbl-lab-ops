/**
 * Date helpers. Report dates are stored as SQL DATE and handled as "YYYY-MM-DD" strings
 * everywhere in the app, so there is never a time-zone shift on the calendar date.
 * Timestamps (created/updated/prepared/verified) are displayed in APP_TIMEZONE.
 */

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Kolkata";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

interface TzParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function partsInTz(date: Date, tz = APP_TIMEZONE): TzParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: hour === "24" ? "00" : hour,
    minute: get("minute"),
    second: get("second"),
  };
}

export function todayInTz(tz = APP_TIMEZONE): string {
  const p = partsInTz(new Date(), tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, months: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

export function weekdayName(dateStr: string): string {
  if (!isDateString(dateStr)) return "";
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

/** Monday is the first day of the week. */
export function startOfWeek(dateStr: string): string {
  const dow = (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(dateStr, -dow);
}

export function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 8)}01`;
}

export function endOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → Date at UTC midnight, the value Prisma writes to a DATE column. */
export function dateOnlyToDb(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function dbDateToString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** dd/mm/yyyy */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const s = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  if (!DATE_RE.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/** dd/mm/yyyy, hh:mm AM/PM in the app time zone */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  const p = partsInTz(d);
  const h = Number(p.hour);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${p.day}/${p.month}/${p.year}, ${String(h12).padStart(2, "0")}:${p.minute} ${h >= 12 ? "PM" : "AM"}`;
}

/** Wall-clock time in the app time zone expressed as a UTC Date (Excel has no time zones). */
export function toWallClockDate(d: Date): Date {
  const p = partsInTz(d);
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second));
}

/** Value for <input type="datetime-local"> in the app time zone. */
export function toDateTimeLocalValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const p = partsInTz(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Parse a datetime-local value, interpreting it in the app time zone. Returns ISO string. */
export function fromDateTimeLocalValue(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offset = toWallClockDate(new Date(guess)).getTime() - guess;
  return new Date(guess - offset).toISOString();
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function shortDayLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export type DateRangeKey = "all" | "today" | "yesterday" | "week" | "month" | "date" | "custom";

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "all", label: "All Records" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "date", label: "Selected Date" },
  { value: "custom", label: "Custom Date Range" },
];

export function isDateRangeKey(v: unknown): v is DateRangeKey {
  return DATE_RANGE_OPTIONS.some((o) => o.value === v);
}

export interface ResolvedRange {
  from: string | null;
  to: string | null;
  label: string;
  error?: string;
}

export function resolveDateRange(
  range: DateRangeKey,
  opts: { date?: string | null; from?: string | null; to?: string | null },
  today: string = todayInTz(),
): ResolvedRange {
  switch (range) {
    case "today":
      return { from: today, to: today, label: `Today (${formatDate(today)})` };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y, label: `Yesterday (${formatDate(y)})` };
    }
    case "week": {
      const from = startOfWeek(today);
      const to = addDays(from, 6);
      return { from, to, label: `This week (${formatDate(from)} – ${formatDate(to)})` };
    }
    case "month": {
      const from = startOfMonth(today);
      const to = endOfMonth(today);
      return { from, to, label: `This month (${formatDate(from)} – ${formatDate(to)})` };
    }
    case "date":
      if (!isDateString(opts.date)) return { from: null, to: null, label: "", error: "Select a date." };
      return { from: opts.date, to: opts.date, label: formatDate(opts.date) };
    case "custom": {
      if (!isDateString(opts.from) || !isDateString(opts.to)) {
        return { from: null, to: null, label: "", error: "Select both From Date and To Date." };
      }
      if (opts.from > opts.to) {
        return { from: null, to: null, label: "", error: "From Date must be on or before To Date." };
      }
      return { from: opts.from, to: opts.to, label: `${formatDate(opts.from)} – ${formatDate(opts.to)}` };
    }
    default:
      return { from: null, to: null, label: "All records" };
  }
}
