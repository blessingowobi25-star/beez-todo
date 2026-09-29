import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  calendarDaysBetween,
  describeDueDate,
  formatClock,
  formatRelativeTime,
  isDueToday,
  isOverdue,
  parseISODate,
  toISODate,
  todayISO,
} from '../lib/date';

describe('date helpers', () => {
  it('formats dates as local ISO calendar days', () => {
    expect(toISODate(new Date(2026, 8, 29))).toBe('2026-09-29');
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('parses ISO dates and rejects junk', () => {
    expect(parseISODate('2026-02-28')?.getDate()).toBe(28);
    expect(parseISODate('28-02-2026')).toBeNull();
    expect(parseISODate('')).toBeNull();
    expect(parseISODate(null)).toBeNull();
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('measures whole calendar days between dates', () => {
    expect(calendarDaysBetween('2026-09-29', '2026-10-02')).toBe(3);
    expect(calendarDaysBetween('2026-09-29', '2026-09-27')).toBe(-2);
    expect(calendarDaysBetween('not-a-date', '2026-09-29')).toBe(0);
  });

  it('flags overdue and due-today tasks', () => {
    expect(isOverdue('2026-09-28', '2026-09-29')).toBe(true);
    expect(isOverdue('2026-09-29', '2026-09-29')).toBe(false);
    expect(isDueToday('2026-09-29', '2026-09-29')).toBe(true);
    expect(isDueToday(null, '2026-09-29')).toBe(false);
  });

  it('describes due dates with the right tone', () => {
    expect(describeDueDate(null, '2026-09-29').tone).toBe('none');
    expect(describeDueDate('2026-09-28', '2026-09-29')).toEqual({
      label: 'Overdue by 1 day',
      tone: 'overdue',
    });
    expect(describeDueDate('2026-09-27', '2026-09-29').label).toBe('Overdue by 2 days');
    expect(describeDueDate('2026-09-29', '2026-09-29').tone).toBe('today');
    expect(describeDueDate('2026-09-30', '2026-09-29')).toEqual({
      label: 'Due tomorrow',
      tone: 'soon',
    });
    expect(describeDueDate('2026-10-02', '2026-09-29').label).toBe('Due in 3 days');
    expect(describeDueDate('2026-11-20', '2026-09-29').tone).toBe('later');
  });

  it('formats the focus timer clock', () => {
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(59)).toBe('00:59');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('adds an hour segment once the clock passes 60 minutes', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3661)).toBe('1:01:01');
    expect(formatClock(7325)).toBe('2:02:05');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('formats relative timestamps', () => {
    const now = new Date('2026-09-29T12:00:00.000Z');
    expect(formatRelativeTime('2026-09-29T11:59:50.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-09-29T11:30:00.000Z', now)).toBe('30m ago');
    expect(formatRelativeTime('2026-09-29T07:00:00.000Z', now)).toBe('5h ago');
    expect(formatRelativeTime('2026-09-26T12:00:00.000Z', now)).toBe('3d ago');
    expect(formatRelativeTime('nonsense', now)).toBe('');
  });
});
