import type { Task, TaskStats } from '../types';
import { formatLongDate } from '../lib/date';
import { compareByUrgency } from '../lib/taskUtils';
import { IconArrow, IconBell, IconCalendar, IconClock } from './icons';

interface DashboardHeroProps {
  stats: TaskStats;
  nextTask: Task | null;
  greetingName: string;
  todayLabel: string;
  onFocusTask: (id: string) => void;
  onAddTask: () => void;
}

/** Greeting header plus the highlighted next-task card from the mobile sample. */
export function DashboardHero({ stats, nextTask, greetingName, todayLabel, onFocusTask, onAddTask }: DashboardHeroProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dueLabel = nextTask?.dueDate ? formatLongDate(nextTask.dueDate) : 'No due date';

  return (
    <section className="hero" aria-label="Today overview">
      <div className="hero__top">
        <div className="hero__identity">
          <span className="hero__avatar" aria-hidden="true">
            {greetingName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="hero__greeting">{greeting},</p>
            <p className="hero__name">{greetingName}</p>
          </div>
        </div>
        <div className="hero__top-actions">
          <span className="hero__date">
            <IconCalendar width={15} height={15} /> {todayLabel}
          </span>
          <button type="button" className="icon-button hero__bell" aria-label="Notifications">
            <IconBell width={18} height={18} />
            {stats.overdue > 0 ? <span className="hero__bell-dot" aria-hidden="true" /> : null}
          </button>
        </div>
      </div>

      <h2 className="hero__headline">
        You have {stats.active} {stats.active === 1 ? 'task' : 'tasks'} for today
      </h2>

      <div className="hero__actions">
        <button type="button" className="button button--primary hero__add" onClick={onAddTask}>
          + New task
        </button>
        <span className="muted hero__hint">
          <IconClock width={14} height={14} /> {stats.dueToday} due today · {stats.overdue} overdue
        </span>
      </div>

      {nextTask ? (
        <article className="hero-card" aria-label={`Next task: ${nextTask.title}`}>
          <div className="hero-card__main">
            <p className="hero-card__eyebrow">Next task</p>
            <h3 className="hero-card__title">{nextTask.title}</h3>
            <p className="hero-card__meta">
              {[nextTask.priority, dueLabel].filter(Boolean).join(' · ')}
            </p>
            <button type="button" className="hero-card__cta" onClick={() => onFocusTask(nextTask.id)}>
              Start focus <IconArrow width={16} height={16} />
            </button>
          </div>
          <span className="hero-card__art" aria-hidden="true">
            <span className="hero-card__orb" />
            <span className="hero-card__ring" />
          </span>
        </article>
      ) : (
        <article className="hero-card" aria-label="No tasks left">
          <div className="hero-card__main">
            <p className="hero-card__eyebrow">All clear</p>
            <h3 className="hero-card__title">Nothing due — enjoy the calm.</h3>
            <button type="button" className="hero-card__cta" onClick={onAddTask}>
              Plan something <IconArrow width={16} height={16} />
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
