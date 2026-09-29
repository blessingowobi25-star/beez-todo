import type { Task, TaskStats } from '../types';
import { formatLongDate } from '../lib/date';
import { compareByUrgency } from '../lib/taskUtils';
import { IconArrow } from './icons';

interface DashboardHeroProps {
  stats: TaskStats;
  nextTask: Task | null;
  onFocusTask: (id: string) => void;
  onAddTask: () => void;
}

/**
 * Compact summary: how many tasks are open, plus the next task worth doing.
 * Deliberately minimal — the header already carries the brand and the calendar
 * already carries the date, so repeating them here was pure noise.
 */
export function DashboardHero({ stats, nextTask, onFocusTask, onAddTask }: DashboardHeroProps) {
  const openLabel = stats.active === 1 ? '1 task in progress' : `${stats.active} tasks in progress`;

  return (
    <section className="hero" aria-label="Today overview">
      <div className="hero__summary">
        <h2 className="hero__headline">{stats.active === 0 ? 'Nothing open' : openLabel}</h2>
        {stats.overdue > 0 ? (
          <span className="hero__alert">{stats.overdue} overdue</span>
        ) : null}
      </div>

      {nextTask ? (
        <article className="hero-card" aria-label={`Next task: ${nextTask.title}`}>
          <div className="hero-card__main">
            <p className="hero-card__eyebrow">Next up</p>
            <h3 className="hero-card__title">{nextTask.title}</h3>
            {nextTask.dueDate ? <p className="hero-card__meta">Due {formatLongDate(nextTask.dueDate)}</p> : null}
            <button type="button" className="hero-card__cta" onClick={() => onFocusTask(nextTask.id)}>
              Focus <IconArrow width={16} height={16} />
            </button>
          </div>
        </article>
      ) : (
        <article className="hero-card hero-card--empty" aria-label="No open tasks">
          <div className="hero-card__main">
            <h3 className="hero-card__title">Add a task to get started</h3>
            <button type="button" className="hero-card__cta" onClick={onAddTask}>
              New task <IconArrow width={16} height={16} />
            </button>
          </div>
        </article>
      )}
    </section>
  );
}

export function pickNextTask(tasks: Task[]): Task | null {
  const open = tasks.filter((task) => !task.done);
  if (open.length === 0) return null;
  return [...open].sort(compareByUrgency)[0] ?? null;
}
