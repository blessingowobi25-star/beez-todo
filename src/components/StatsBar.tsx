import type { TaskStats } from '../types';

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
        <button type="button" className="stat-card" onClick={onShowAll}>
          <span className="stat-card__value">{stats.active}</span>
          <span className="stat-card__label">Active</span>
        </button>
        <button type="button" className="stat-card" onClick={onShowToday}>
          <span className="stat-card__value">{stats.dueToday}</span>
          <span className="stat-card__label">Due today</span>
        </button>
        <button
          type="button"
          className={`stat-card${stats.overdue > 0 ? ' stat-card--alert' : ''}`}
          onClick={onShowOverdue}
        >
          <span className="stat-card__value">{stats.overdue}</span>
          <span className="stat-card__label">Overdue</span>
        </button>
        <div className="stat-card stat-card--static">
          <span className="stat-card__value">{stats.focusSessions}</span>
          <span className="stat-card__label">Focus sessions</span>
        </div>
      </div>
    </section>
  );
}
