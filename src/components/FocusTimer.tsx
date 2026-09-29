import type { Task } from '../types';
import { formatClock } from '../lib/date';
import { FOCUS_PRESETS, useFocusTimer } from '../hooks/useFocusTimer';

interface FocusTimerProps {
  tasks: Task[];
  selectedTaskId: string | null;
  today: string;
  onSelectTask: (taskId: string | null) => void;
  onSessionComplete: (taskId: string) => void;
}

/** Extra feature: a Pomodoro-style focus timer that logs sessions against a task. */
export function FocusTimer({
  tasks,
  selectedTaskId,
  today,
  onSelectTask,
  onSessionComplete,
}: FocusTimerProps) {
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const timer = useFocusTimer(() => {
    if (selectedTask) onSessionComplete(selectedTask.id);
  });

  const openTasks = tasks.filter((task) => !task.done);
  const sessionsOnSelected = selectedTask ? selectedTask.focusSessions : 0;

  return (
    <section className="focus card" aria-label="Focus timer">
      <header className="focus__header">
        <h2 className="card__title">Focus timer</h2>
        <span className="badge badge--muted">🍅 Pomodoro</span>
      </header>

      <label className="field">
        <span className="field__label">Working on</span>
        <select
          className="input"
          value={selectedTaskId ?? ''}
          onChange={(event) => onSelectTask(event.target.value || null)}
          aria-label="Task to focus on"
        >
          <option value="">No specific task</option>
          {openTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>

      <div className="focus__clock" aria-live="off">
        <span className="focus__time">{formatClock(timer.remaining)}</span>
        <span className="focus__state">{timer.running ? 'Focusing…' : 'Paused'}</span>
      </div>

      <div className="progress" role="progressbar" aria-valuenow={Math.round(timer.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress__bar" style={{ width: `${Math.round(timer.progress * 100)}%` }} />
      </div>

      <div className="chip-row">
        {FOCUS_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`chip${timer.minutes === preset ? ' chip--active' : ''}`}
            onClick={() => timer.setMinutes(preset)}
          >
            {preset} min
          </button>
        ))}
      </div>

      <div className="focus__controls">
        {timer.running ? (
          <button type="button" className="button button--primary" onClick={timer.pause}>
            Pause
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={timer.start}>
            {timer.remaining === timer.minutes * 60 ? 'Start' : 'Resume'}
          </button>
        )}
        <button type="button" className="button" onClick={timer.reset}>
          Reset
        </button>
      </div>

      <dl className="focus__stats">
        <div>
          <dt>Sessions finished (this visit)</dt>
          <dd>{timer.completedSessions}</dd>
        </div>
        <div>
          <dt>Sessions logged on this task</dt>
          <dd>{sessionsOnSelected}</dd>
        </div>
        <div>
          <dt>Today</dt>
          <dd>{today}</dd>
        </div>
      </dl>

      <p className="muted focus__hint">
        Each completed session adds one 🎯 to the task, so you can see where your time went.
      </p>
    </section>
  );
}
