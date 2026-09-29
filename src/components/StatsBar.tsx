import type { TaskStats } from '../types';
import { IconCalendar, IconClock, IconTarget } from './icons';

interface StatsBarProps {
  stats: TaskStats;
  onShowOverdue: () => void;
  onShowToday: () => void;
  onShowAll: () => void;
}

/** Progress summary. The overdue/today cards double as filter shortcuts. */
export function StatsBar({ stats, onShowOverdue, onShowToday, onShowAll }: StatsBarProps) {
  return (
    <section className="stats" aria-label="Progress summary">
      <div className="stats__progress">
        <div className="stats__progress-head">
          <span>{stats.completionRate}% complete</span>
          <span className="stats__progress-count">
            {stats.completed}/{stats.total} tasks
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={stats.completionRate} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress__bar" style={{ width: `${stats.completionRate}%` }} />
        </div>
      </div>

      <div className="stats__cards">
        {/* Each tile is a filter shortcut, so the accessible name has to say what
            tapping it does, not just what the number is. */}
        <button
          type="button"
          className="stat-card stat-card--lilac"
          onClick={onShowAll}
          aria-label={`Show ${stats.active} active tasks`}
        >
          <span className="stat-card__value">{stats.active}</span>
          <span className="stat-card__label">Active</span>
        </button>
        <button
          type="button"
          className="stat-card stat-card--sky"
          onClick={onShowToday}
          aria-label={`Show ${stats.dueToday} tasks due today`}
        >
          <span className="stat-card__value"><IconCalendar width={16} height={16} /> {stats.dueToday}</span>
          <span className="stat-card__label">Due today</span>
        </button>
        <button
          type="button"
          className={`stat-card stat-card--peach${stats.overdue > 0 ? ' stat-card--alert' : ''}`}
          onClick={onShowOverdue}
          aria-label={`Show ${stats.overdue} overdue tasks`}
        >
          <span className="stat-card__value"><IconClock width={16} height={16} /> {stats.overdue}</span>
          <span className="stat-card__label">Overdue</span>
        </button>
        <div className="stat-card stat-card--mint stat-card--static">
          <span className="stat-card__value"><IconTarget width={16} height={16} /> {stats.focusSessions}</span>
          <span className="stat-card__label">Focus sessions</span>
        </div>
      </div>
    </section>
  );
}
