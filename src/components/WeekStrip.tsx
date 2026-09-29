import { useMemo, useState } from 'react';
import { addDaysISO, formatLongDate, parseISODate, todayISO } from '../lib/date';
import { IconCalendar, IconChevron } from './icons';

interface WeekStripProps {
  today: string;
  selectedDate: string;
  counts: Map<string, number>;
  onSelectDate: (date: string) => void;
  onShowAll: () => void;
}

/** Horizontal 7-day planner strip inspired by the mobile calendar sample. */
export function WeekStrip({ today, selectedDate, counts, onSelectDate, onShowAll }: WeekStripProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const anchor = useMemo(() => addDaysISO(today, weekOffset * 7), [today, weekOffset]);
  const selected = parseISODate(selectedDate);
  const monthLabel = selected
    ? selected.toLocaleDateString(undefined, { month: 'long' })
    : formatLongDate(today);

  return (
    <section className="week card" aria-label="Calendar week">
      <header className="week__header">
        <button
          type="button"
          className="icon-button"
          onClick={() => setWeekOffset((offset) => offset - 1)}
          aria-label="Previous week"
        >
          <IconChevron width={18} height={18} />
        </button>
        <div className="week__title">
          <span className="week__eyebrow">
            <IconCalendar width={15} height={15} /> Calendar
          </span>
          <h2>{monthLabel}</h2>
        </div>
        <button
          type="button"
          className="icon-button icon-button--flip"
          onClick={() => setWeekOffset((offset) => offset + 1)}
          aria-label="Next week"
        >
          <IconChevron width={18} height={18} />
        </button>
      </header>
      <ol className="week__days">
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDaysISO(anchor, index - ((parseISODate(anchor)?.getDay() ?? 0) + 6) % 7);
          const parsed = parseISODate(date);
          const dayNumber = parsed ? String(parsed.getDate()).padStart(2, '0') : '--';
          const weekday = parsed
            ? parsed.toLocaleDateString(undefined, { weekday: 'short' })
            : '';
          const active = date === selectedDate;
          const isToday = date === todayISO();
          const count = counts.get(date) ?? 0;
          return (
            <li key={date}>
              <button
                type="button"
                className={`week__day${active ? ' week__day--active' : ''}${isToday ? ' week__day--today' : ''}`}
                onClick={() => onSelectDate(date)}
                aria-pressed={active}
                aria-label={`${weekday} ${dayNumber}${count > 0 ? `, ${count} tasks` : ''}`}
              >
                <span className="week__day-number">{dayNumber}</span>
                <span className="week__day-name">{weekday}</span>
                <span className={`week__dot${count > 0 ? ' week__dot--busy' : ''}`} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" className="button button--ghost week__all" onClick={onShowAll}>
        Show all dates
      </button>
    </section>
  );
}
