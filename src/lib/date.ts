import type { DueInfo } from '../types';

const MS_PER_DAY = 86_400_000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a Date as `YYYY-MM-DD` in local time (never UTC, to avoid off-by-one day bugs). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today as `YYYY-MM-DD`. `now` is injectable so date logic stays deterministic in tests. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Parses `YYYY-MM-DD` into a local Date, returning null for empty/invalid input. */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Shifts an ISO calendar date by a number of days. */
export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Shifts an ISO calendar date by a number of months, clamping to the month length. */
export function addMonthsISO(iso: string, months: number): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Clamp: Jan 31 + 1 month would otherwise overflow into March.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISODate(date);
}

/**
 * The 42 ISO dates (6 weeks) covering a month grid, Monday-first.
 * Includes the leading/next-month days so every week is a full rectangle and the
 * grid never reflows as the user pages between months.
 */
export function monthGridISO(anchorISO: string): string[] {
  const anchor = parseISODate(anchorISO);
  if (!anchor) return [];
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // getDay() is Sunday=0; shift so Monday=0.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = addDaysISO(toISODate(firstOfMonth), -leadingBlanks);
  return Array.from({ length: 42 }, (_, index) => addDaysISO(gridStart, index));
}

/** True when the ISO date falls in the same calendar month as `anchorISO`. */
export function isSameMonth(iso: string, anchorISO: string): boolean {
  const date = parseISODate(iso);
  const anchor = parseISODate(anchorISO);
  if (!date || !anchor) return false;
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
}

/** Whole calendar days from `fromISO` to `toISO` (negative when `toISO` is in the past). */
export function calendarDaysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** `Sat, 12 Sep` style label for a due date. */
export function formatLongDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function isOverdue(dueDate: string | null, today: string = todayISO()): boolean {
  if (!dueDate) return false;
  return calendarDaysBetween(today, dueDate) < 0;
}

export function isDueToday(dueDate: string | null, today: string = todayISO()): boolean {
  if (!dueDate) return false;
  return calendarDaysBetween(today, dueDate) === 0;
}

/** Human readable due-date badge used by the task list. */
export function describeDueDate(dueDate: string | null, today: string = todayISO()): DueInfo {
  if (!dueDate) return { label: 'No due date', tone: 'none' };

  const delta = calendarDaysBetween(today, dueDate);
  if (delta < 0) {
    const overdueDays = Math.abs(delta);
    return {
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      tone: 'overdue',
    };
  }
  if (delta === 0) return { label: 'Due today', tone: 'today' };
  if (delta === 1) return { label: 'Due tomorrow', tone: 'soon' };
  if (delta <= 7) return { label: `Due in ${delta} days`, tone: 'soon' };
  return { label: formatLongDate(dueDate), tone: 'later' };
}

/** `just now` / `5m ago` / `3d ago` style label for note metadata. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

/** Formats a whole number of seconds as `H:MM:SS` / `MM:SS` for the focus timer. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
