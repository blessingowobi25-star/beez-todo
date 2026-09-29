import { useMemo, useState } from 'react';
import { addMonthsISO, isSameMonth, monthGridISO, parseISODate, todayISO } from '../lib/date';
import { IconCalendar, IconChevron } from './icons';

interface MonthCalendarProps {
  today: string;
  selectedDate: string;
  counts: Map<string, number>;
  onSelectDate: (date: string) => void;
  onShowAll: () => void;
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Full month calendar: a 7x6 grid of square day cells with month and year
 * navigation. Days outside the visible month are dimmed rather than hidden so
 * every week is a complete row.
 */
export function MonthCalendar({ today, selectedDate, counts, onSelectDate, onShowAll }: MonthCalendarProps) {
  // Anchor on the selected day when there is one, so paging never loses the user's place.
  const [monthAnchor, setMonthAnchor] = useState(selectedDate || today);
  const anchor = parseISODate(monthAnchor) ?? parseISODate(today);
  const days = useMemo(() => monthGridISO(monthAnchor), [monthAnchor]);

  if (!anchor) return null;

  const monthTitle = anchor.toLocaleDateString(undefined, { month: 'long' });
  const yearTitle = String(anchor.getFullYear());

  function handleSelect(date: string) {
    // Selecting a spill-over day should follow it into the adjacent month.
    if (!isSameMonth(date, monthAnchor)) setMonthAnchor(date);
    onSelectDate(date);
  }

  return (
    <section className="week card" aria-label="Calendar">
      <header className="week__header">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMonthAnchor((iso) => addMonthsISO(iso, -1))}
          aria-label="Previous month"
        >
          <IconChevron width={18} height={18} />
        </button>
        <div className="week__title">
          <span className="week__eyebrow">
            <IconCalendar width={15} height={15} /> Calendar
          </span>
          <h2>
            {monthTitle} {yearTitle}
          </h2>
        </div>
        <div className="week__nav">
          <button
            type="button"
            className="button button--ghost week__today-btn"
            onClick={() => {
              setMonthAnchor(today);
              onSelectDate(today);
            }}
            aria-label="Jump to today"
          >
            Today
          </button>
          <button
            type="button"
            className="icon-button icon-button--flip"
            onClick={() => setMonthAnchor((iso) => addMonthsISO(iso, 1))}
            aria-label="Next month"
          >
            <IconChevron width={18} height={18} />
          </button>
        </div>
      </header>

      <div className="week__grid-wrap">
        <div className="week__weekdays" aria-hidden="true">
          {WEEKDAY_INITIALS.map((initial, index) => (
            <span key={WEEKDAY_NAMES[index]} className="week__weekday" title={WEEKDAY_NAMES[index]}>
              {initial}
            </span>
          ))}
        </div>

        {/* A grid, not a list: the stray "1. 2. 3." markers came from an <ol> whose
            list-style was never reset. */}
        <div className="week__grid" role="grid" aria-label={`${monthTitle} ${yearTitle}`}>
          {days.map((date) => {
            const parsed = parseISODate(date);
            if (!parsed) return null;
            const dayNumber = parsed.getDate();
            const isToday = date === todayISO();
            const isSelected = date === selectedDate;
            const count = counts.get(date) ?? 0;
            const outside = !isSameMonth(date, monthAnchor);
            const classes = [
              'week__cell',
              isSelected ? 'week__cell--selected' : '',
              isToday ? 'week__cell--today' : '',
              outside ? 'week__cell--outside' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                className={classes}
                onClick={() => handleSelect(date)}
                aria-pressed={isSelected}
                aria-label={`${parsed.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}${isToday ? ', today' : ''}${count > 0 ? `, ${count} tasks due` : ''}`}
              >
                <span className="week__cell-number">{dayNumber}</span>
                {isToday ? <span className="week__today-dot" aria-hidden="true" /> : null}
                {count > 0 ? <span className="week__badge">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="button button--ghost week__all" onClick={onShowAll}>
        Show all dates
      </button>
    </section>
  );
}
